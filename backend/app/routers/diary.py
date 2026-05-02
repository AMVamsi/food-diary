from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.supabase import supabase
from app.middleware.auth_guard import get_current_user

router = APIRouter(tags=["diary"])


class DiaryEntryIn(BaseModel):
    """Minimal payload for #14 photo-log save. Full router lands with #17."""

    entry_type: Literal["photo", "manual"]
    food_name: str = Field(min_length=1)
    kcal: float = Field(ge=0)
    amount: float = Field(gt=0)
    unit: Literal["g", "ml"]
    occasion: Optional[str] = None
    image_url: Optional[str] = None
    logged_at: Optional[str] = None
    notes: Optional[str] = None


class DiaryEntryOut(BaseModel):
    id: str
    entry_type: str
    food_name: str
    kcal: float
    grams: Optional[float] = None
    image_url: Optional[str] = None
    logged_at: str
    notes: Optional[str] = None


@router.post("", response_model=DiaryEntryOut)
async def create_entry(
    entry_in: DiaryEntryIn,
    current_user=Depends(get_current_user),
) -> DiaryEntryOut:
    """Insert one diary entry for the authenticated user.

    Maps `amount` -> `grams` (DB column). `occasion` is accepted but not yet
    persisted: the diary_entries table has no occasion column in the current
    schema. #17 will revisit this and add full GET/DELETE.
    """
    user_id = str(current_user.id)

    row = {
        "user_id": user_id,
        "entry_type": entry_in.entry_type,
        "food_name": entry_in.food_name,
        "kcal": entry_in.kcal,
        "grams": entry_in.amount,
        "image_url": entry_in.image_url,
        "notes": entry_in.notes,
    }
    if entry_in.logged_at is not None:
        row["logged_at"] = entry_in.logged_at

    try:
        result = supabase.table("diary_entries").insert(row).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Database error", "detail": str(e)},
        )

    if not result.data:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Insert failed",
                "detail": "Diary entry was not returned after insert.",
            },
        )

    return DiaryEntryOut(**result.data[0])
