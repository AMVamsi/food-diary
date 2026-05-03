import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
import httpx
import os
from app.db.supabase import supabase
from app.middleware.auth_guard import get_current_user
from app.models.schemas import ErrorResponse

router = APIRouter()

LOGMEAL_BASE_URL = "https://api.logmeal.com/v2"


def get_logmeal_key() -> str:
    """Read LogMeal API key from environment. Raise clearly if missing."""
    key = os.getenv("LOGMEAL_API_KEY")
    if not key:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Service unavailable",
                "detail": "LOGMEAL_API_KEY is not configured on this server",
            },
        )
    return key



@router.post("/segment")
async def segment_image(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
) -> dict:
    """
    Accepts a meal image upload and forwards it to the LogMeal segmentation API.
    Returns image_id, processed_image_size, occasion, and segmentation_results
    with bounding boxes and top dish candidates per region.
    After a successful segmentation the image is uploaded to Supabase Storage
    and a public image_url is included in the response (null if upload fails).
    The API key is injected server-side — it never leaves this backend.
    """
    api_key = get_logmeal_key()

    # Read file content once — UploadFile is a stream, cannot be read twice
    file_content = await file.read()
    if not file_content:
        raise HTTPException(
            status_code=400,
            detail={"error": "Empty file", "detail": "The uploaded file is empty"},
        )

    # Normalise non-standard MIME types before forwarding to LogMeal.
    # React Native derives 'image/jpg' from .jpg extensions, which is not a
    # registered IANA type — LogMeal rejects it with a 400.
    content_type = file.content_type or "image/jpeg"
    if content_type == "image/jpg":
        content_type = "image/jpeg"

    print(
        f"[segment DEBUG] filename={file.filename!r} content_type_raw={file.content_type!r} content_type_used={content_type!r} size={len(file_content)}"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LOGMEAL_BASE_URL}/image/segmentation/complete",
                headers={"Authorization": f"Bearer {api_key}"},
                files={
                    "image": (
                        file.filename or "image.jpg",
                        file_content,
                        content_type,
                    )
                },
            )

        if response.status_code == 401:
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "LogMeal authentication failed",
                    "detail": "The server LogMeal API key is invalid or expired",
                },
            )

        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit reached",
                    "detail": "LogMeal rate limit reached — please wait a moment",
                },
            )

        if response.status_code == 400:
            # LogMeal 400 = bad image (too large, unsupported format, corrupt).
            # Surface as 422 so the client shows "photo could not be processed".
            print(f"[segment DEBUG] LogMeal 400 body={response.text[:500]!r}")
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Invalid image",
                    "detail": f"LogMeal rejected the image: {response.text[:200]}",
                },
            )

        if response.status_code >= 500:
            print(
                f"[segment DEBUG] LogMeal status={response.status_code} body={response.text[:500]!r}"
            )
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "Food recognition service unavailable",
                    "detail": "Food recognition service is temporarily unavailable",
                },
            )

        if not response.is_success:
            print(
                f"[segment DEBUG] LogMeal status={response.status_code} body={response.text[:500]!r}"
            )
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "LogMeal error",
                    "detail": f"LogMeal returned status {response.status_code}: {response.text[:200]}",
                },
            )

        data: dict = response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail={
                "error": "Request timed out",
                "detail": "The food recognition service took too long to respond. Please try again.",
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Service unreachable",
                "detail": str(exc),
            },
        )

    # Upload image to Supabase Storage. Failure must not block the response.
    image_url: str | None = None
    try:
        user_id = str(current_user.id)
        storage_path = f"{user_id}/{uuid.uuid4()}.jpg"
        supabase.storage.from_("meal-images").upload(
            storage_path,
            file_content,
            {"content-type": "image/jpeg"},
        )
        image_url = supabase.storage.from_("meal-images").get_public_url(storage_path)
    except Exception as e:
        print(f"[segment] Supabase Storage upload failed: {e} — returning image_url=null")

    data["image_url"] = image_url
    return data


@router.post("/confirm")
async def confirm_dish(
    payload: dict,
    current_user=Depends(get_current_user),
) -> dict:
    """
    Forwards the user's dish selection to LogMeal for confirmation.
    Payload must contain imageId, dish_id, and regionId as returned
    by the segmentation step.
    """
    api_key = get_logmeal_key()

    # Validate required fields are present before forwarding
    required = {"imageId", "dish_id", "regionId"}
    missing = required - set(payload.keys())
    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Missing fields",
                "detail": f"Required fields missing from payload: {sorted(missing)}",
            },
        )

    # LogMeal calls this field "confirmedClass"; our mobile sends it as "dish_id".
    logmeal_payload = {
        "imageId": payload["imageId"],
        "regionId": payload["regionId"],
        "confirmedClass": payload["dish_id"],
    }
    print(f"[confirm DEBUG] forwarding payload={logmeal_payload}")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{LOGMEAL_BASE_URL}/image/confirm/dish",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=logmeal_payload,
            )

        print(f"[confirm DEBUG] LogMeal status={response.status_code} body={response.text[:500]!r}")

        if response.status_code == 401:
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "LogMeal authentication failed",
                    "detail": "The server LogMeal API key is invalid or expired",
                },
            )

        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit reached",
                    "detail": "LogMeal rate limit reached — please wait a moment",
                },
            )

        if response.status_code >= 500:
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "Food recognition service unavailable",
                    "detail": "Food recognition service is temporarily unavailable",
                },
            )

        if not response.is_success:
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "LogMeal error",
                    "detail": f"LogMeal returned status {response.status_code}: {response.text[:200]}",
                },
            )

        return response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail={
                "error": "Request timed out",
                "detail": "The food confirmation service timed out. Please try again.",
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Service unreachable",
                "detail": str(exc),
            },
        )


@router.post("/nutrition")
async def get_nutritional_info(
    payload: dict,
    current_user=Depends(get_current_user),
) -> dict:
    """
    Fetches nutritional information for a confirmed meal image.
    Payload must contain imageId from the segmentation response.
    Returns ENERC_KCAL (energy in kcal) in totalNutritients and per-item breakdown.
    Note: LogMeal uses the typo 'totalNutritients' — this is preserved as-is.
    """
    api_key = get_logmeal_key()

    if "imageId" not in payload:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Missing field",
                "detail": "imageId is required",
            },
        )

    print(f"[nutrition DEBUG] forwarding payload={payload}")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{LOGMEAL_BASE_URL}/nutrition/recipe/nutritionalInfo",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"imageId": payload["imageId"]},
            )

        print(f"[nutrition DEBUG] LogMeal status={response.status_code} body={response.text[:500]!r}")

        if response.status_code == 401:
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "LogMeal authentication failed",
                    "detail": "The server LogMeal API key is invalid or expired",
                },
            )

        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit reached",
                    "detail": "LogMeal rate limit reached — please wait a moment",
                },
            )

        if response.status_code >= 500:
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "Food recognition service unavailable",
                    "detail": "Food recognition service is temporarily unavailable",
                },
            )

        if not response.is_success:
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "LogMeal error",
                    "detail": f"LogMeal returned status {response.status_code}: {response.text[:200]}",
                },
            )

        return response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail={
                "error": "Request timed out",
                "detail": "Nutrition lookup timed out. Please try again.",
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Service unreachable",
                "detail": str(exc),
            },
        )


@router.get("/ingredients")
async def get_ingredients(
    current_user=Depends(get_current_user),
) -> dict:
    """
    Returns the LogMeal ingredient catalogue as {ingredients: [{id, name}]}.
    Checks Supabase ingredient_cache first. If a row with fetched_at within the
    last 24 hours exists, returns cached data without calling LogMeal.
    On a cache miss, fetches from LogMeal, replaces the cache, and returns fresh data.
    A cache write failure does not block the response — the fetched data is
    returned to the client and the error is logged.
    """
    # ── Step 1: check cache freshness with a lightweight query ────────────────
    try:
        latest_res = (
            supabase.table("ingredient_cache")
            .select("fetched_at")
            .order("fetched_at", desc=True)
            .limit(1)
            .execute()
        )
        latest_rows: list[dict] = latest_res.data or []
    except Exception as e:
        print(f"[ingredients] cache freshness check failed: {e}")
        latest_rows = []

    if latest_rows:
        ts = latest_rows[0]["fetched_at"].replace("Z", "+00:00")
        try:
            fetched_dt = datetime.fromisoformat(ts)
            if fetched_dt.tzinfo is None:
                fetched_dt = fetched_dt.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - fetched_dt < timedelta(hours=24):
                try:
                    cache_res = (
                        supabase.table("ingredient_cache")
                        .select("id,name")
                        .execute()
                    )
                    cached_rows: list[dict] = cache_res.data or []
                    print(
                        f"ingredient cache hit — returning {len(cached_rows)} items from Supabase"
                    )
                    return {
                        "ingredients": [
                            {"id": r["id"], "name": r["name"]} for r in cached_rows
                        ]
                    }
                except Exception as e:
                    print(f"[ingredients] cache read failed: {e}")
        except (ValueError, KeyError):
            pass  # unparseable timestamp — fall through to fetch

    # ── Step 2: fetch from LogMeal ────────────────────────────────────────────
    print("ingredient cache miss — fetching from LogMeal")
    api_key = get_logmeal_key()

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.get(
                f"{LOGMEAL_BASE_URL}/dataset/ingredients",
                headers={"Authorization": f"Bearer {api_key}"},
            )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail={
                "error": "Request timed out",
                "detail": "Ingredient catalogue request timed out",
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Service unreachable",
                "detail": str(exc),
            },
        )

    if response.status_code == 401:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "LogMeal authentication failed",
                "detail": "The server LogMeal API key is invalid or expired",
            },
        )
    if response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit reached",
                "detail": "LogMeal rate limit reached — please wait a moment",
            },
        )
    if response.status_code >= 500:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Food recognition service unavailable",
                "detail": "Food recognition service is temporarily unavailable",
            },
        )
    if not response.is_success:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "LogMeal error",
                "detail": f"LogMeal returned status {response.status_code}",
            },
        )

    data = response.json()
    if not isinstance(data, list):
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Unexpected response",
                "detail": "LogMeal returned an unexpected shape for the ingredient catalogue",
            },
        )

    # ── Step 3: replace cache ─────────────────────────────────────────────────
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        supabase.table("ingredient_cache").delete().gte("id", 0).execute()
        rows_to_insert: list[dict] = []
        for item in data:
            if not isinstance(item, dict) or "id" not in item or "name" not in item:
                continue
            row: dict = {
                "id": int(item["id"]),
                "name": str(item["name"]),
                "fetched_at": now_iso,
            }
            for col in ("avg_quantity", "modifier_type", "state", "unit"):
                if col in item:
                    row[col] = item[col]
            rows_to_insert.append(row)
        if rows_to_insert:
            supabase.table("ingredient_cache").insert(rows_to_insert).execute()
    except Exception as e:
        print(f"[ingredients] cache write failed: {e} — returning fetched data anyway")

    # ── Step 4: return ────────────────────────────────────────────────────────
    return {
        "ingredients": [
            {"id": int(item["id"]), "name": str(item["name"])}
            for item in data
            if isinstance(item, dict) and "id" in item and "name" in item
        ]
    }


@router.post("/compute_nutrients")
async def compute_nutrients(
    payload: dict,
    current_user=Depends(get_current_user),
) -> dict:
    """
    Computes nutritional information for a basket of ingredients.
    Payload: {"ingredients": [{"id": int, "amount": float}]}
    Proxies to LogMeal /v2/nutrition/recipe/compute_nutrients.
    Transforms payload: id→ingredientId, amount→ingredientAmount (LogMeal field names).
    Response includes ENERC_KCAL in nutritional_info.totalNutritients.
    Note: LogMeal uses the typo 'totalNutritients' — preserved as-is.
    """
    api_key = get_logmeal_key()

    if "ingredients" not in payload or not isinstance(payload["ingredients"], list):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Missing field",
                "detail": "ingredients array is required",
            },
        )

    # LogMeal expects "ingredient_list" with "ingredientId"/"ingredientAmount"
    logmeal_payload = {
        "ingredient_list": [
            {
                "ingredientId": int(item["id"]),
                "ingredientAmount": float(item.get("amount", item.get("quantity", 0))),
            }
            for item in payload["ingredients"]
            if isinstance(item, dict) and "id" in item
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                f"{LOGMEAL_BASE_URL}/nutrition/recipe/compute_nutrients",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=logmeal_payload,
            )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail={
                "error": "Request timed out",
                "detail": "Nutrition calculation timed out — please try again",
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Service unreachable",
                "detail": str(exc),
            },
        )

    if response.status_code == 401:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "LogMeal authentication failed",
                "detail": "The server LogMeal API key is invalid or expired",
            },
        )
    if response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit reached",
                "detail": "LogMeal rate limit reached — please wait a moment",
            },
        )
    if response.status_code >= 500:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Food recognition service unavailable",
                "detail": "Food recognition service is temporarily unavailable",
            },
        )
    if not response.is_success:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "LogMeal error",
                "detail": f"LogMeal returned status {response.status_code}: {response.text[:200]}",
            },
        )

    data = response.json()
    print(f"[compute_nutrients DEBUG] response keys={list(data.keys()) if isinstance(data, dict) else type(data)} body={str(data)[:500]}")
    return data
