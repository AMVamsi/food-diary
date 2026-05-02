from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
import httpx
import os
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
                    "detail": "Too many requests to the food recognition service. Please wait a moment.",
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

        return response.json()

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
                "error": "LogMeal unreachable",
                "detail": str(exc),
            },
        )


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

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{LOGMEAL_BASE_URL}/image/confirm/dish",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit reached",
                    "detail": "Too many requests. Please wait a moment.",
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
                "detail": "The food recognition service timed out. Please try again.",
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "LogMeal unreachable",
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

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{LOGMEAL_BASE_URL}/nutrition/recipe/nutritionalInfo",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit reached",
                    "detail": "Too many requests. Please wait a moment.",
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
                "error": "LogMeal unreachable",
                "detail": str(exc),
            },
        )
