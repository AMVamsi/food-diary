from fastapi import APIRouter, Depends, HTTPException

from app.db.supabase import supabase
from app.middleware.auth_guard import get_current_user
from app.models.schemas import ProfileIn, ProfileOut

router = APIRouter(tags=["profile"])


@router.get("", response_model=ProfileOut)
async def get_profile(current_user=Depends(get_current_user)) -> ProfileOut:
    """Return the authenticated user's profile row; 404 if no profile has been created yet."""
    user_id = str(current_user.id)

    try:
        result = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Database error", "detail": str(e)},
        ) from e

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Profile not found",
                "detail": "No profile exists for this user. Use PUT /profile to create one.",
            },
        )

    return ProfileOut(**result.data[0])


@router.put("", response_model=ProfileOut)
async def upsert_profile(
    profile_in: ProfileIn,
    current_user=Depends(get_current_user),
) -> ProfileOut:
    """Create or update the authenticated user's profile and recompute BMI when both weight and height are available."""
    user_id = str(current_user.id)

    try:
        existing_result = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Database error", "detail": str(e)},
        ) from e
    existing = existing_result.data[0] if existing_result.data else {}

    payload = profile_in.model_dump(exclude_none=True)
    payload["user_id"] = user_id

    weight_kg = payload.get("weight_kg") or existing.get("weight_kg")
    height_cm = payload.get("height_cm") or existing.get("height_cm")

    if weight_kg and height_cm:
        height_m = height_cm / 100
        payload["bmi"] = round(weight_kg / (height_m**2), 1)

    try:
        supabase.table("profiles").upsert(payload, on_conflict="user_id").execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Database error", "detail": str(e)},
        ) from e

    try:
        updated = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Database error", "detail": str(e)},
        ) from e
    if not updated.data:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Profile fetch failed",
                "detail": "Profile was saved but could not be retrieved.",
            },
        )

    return ProfileOut(**updated.data[0])
