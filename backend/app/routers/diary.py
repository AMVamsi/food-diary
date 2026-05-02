from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.db.supabase import supabase
from app.middleware.auth_guard import get_current_user
from app.models.schemas import DiaryDayOut, DiaryEntryIn, DiaryEntryOut

router = APIRouter(tags=["diary"])


def _row_to_entry_out(row: dict) -> DiaryEntryOut:
    """Map a diary_entries DB row (with 'grams' column) to DiaryEntryOut."""
    return DiaryEntryOut(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        entry_type=str(row["entry_type"]),
        food_name=str(row["food_name"]),
        kcal=float(row.get("kcal") or 0),
        amount=float(row.get("grams") or 0),
        unit="g",
        occasion=row.get("occasion"),
        image_url=row.get("image_url"),
        logged_at=str(row["logged_at"]) if row.get("logged_at") else None,
        notes=row.get("notes"),
    )


@router.post("", response_model=DiaryEntryOut, status_code=201)
async def create_entry(
    entry_in: DiaryEntryIn,
    current_user=Depends(get_current_user),
) -> DiaryEntryOut:
    """Insert one diary entry for the authenticated user.

    Maps amount -> grams (DB column). occasion and unit are accepted by the
    schema but the current diary_entries table has no corresponding columns —
    they are preserved in the response shape but not written to the DB.
    Returns HTTP 201 with the created entry.
    """
    user_id = str(current_user.id)
    now_iso = datetime.now(timezone.utc).isoformat()

    row: dict = {
        "user_id": user_id,
        "entry_type": entry_in.entry_type,
        "food_name": entry_in.food_name,
        "kcal": entry_in.kcal,
        "grams": entry_in.amount,
        "image_url": entry_in.image_url,
        "notes": entry_in.notes,
        "logged_at": entry_in.logged_at if entry_in.logged_at is not None else now_iso,
    }

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

    return _row_to_entry_out(result.data[0])


@router.get("", response_model=List[DiaryDayOut])
async def get_entries(
    current_user=Depends(get_current_user),
) -> List[DiaryDayOut]:
    """Fetch all diary entries for the authenticated user, grouped by date.

    Results are ordered by logged_at descending so most-recent dates appear
    first. Within each date group entries are sorted ascending by logged_at.
    Returns an empty list when the user has no entries — never a 404.
    """
    user_id = str(current_user.id)

    try:
        result = (
            supabase.table("diary_entries")
            .select("*")
            .eq("user_id", user_id)
            .order("logged_at", desc=True)
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Database error", "detail": str(e)},
        )

    rows: list[dict] = result.data or []

    # Group rows by the date portion of logged_at (first 10 chars: YYYY-MM-DD).
    day_map: dict[str, list[dict]] = {}
    for row in rows:
        logged_at_str = str(row.get("logged_at") or "")
        date_key = logged_at_str[:10] if len(logged_at_str) >= 10 else "unknown"
        day_map.setdefault(date_key, []).append(row)

    days: List[DiaryDayOut] = []
    for date_key in sorted(day_map.keys(), reverse=True):
        # Sort entries within the group by logged_at ascending.
        group = sorted(
            day_map[date_key],
            key=lambda r: str(r.get("logged_at") or ""),
        )
        entries = [_row_to_entry_out(r) for r in group]
        total_kcal = sum(e.kcal for e in entries)
        days.append(DiaryDayOut(date=date_key, total_kcal=total_kcal, entries=entries))

    return days


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(
    entry_id: str,
    current_user=Depends(get_current_user),
) -> None:
    """Delete a diary entry by ID, confirming it belongs to the authenticated user.

    Returns HTTP 204 on success.
    Returns HTTP 404 when the entry does not exist or belongs to a different
    user — the response is intentionally identical so as not to reveal whether
    an entry exists for another user.
    """
    user_id = str(current_user.id)

    try:
        check = (
            supabase.table("diary_entries")
            .select("user_id")
            .eq("id", entry_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Database error", "detail": str(e)},
        )

    if not check.data or str(check.data[0]["user_id"]) != user_id:
        raise HTTPException(
            status_code=404,
            detail={"error": "Not found", "detail": "Entry not found."},
        )

    try:
        supabase.table("diary_entries").delete().eq("id", entry_id).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Database error", "detail": str(e)},
        )
