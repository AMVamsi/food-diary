from fastapi import Header, HTTPException

from app.db.supabase import supabase


def get_current_user(authorization: str = Header(None)):
    """Reusable FastAPI Depends() that validates a Bearer token via Supabase Auth."""
    if authorization is None:
        raise HTTPException(
            status_code=401,
            detail={"error": "Missing token", "detail": "Authorization header required"},
        )

    parts = authorization.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(
            status_code=401,
            detail={"error": "Missing token", "detail": "Authorization header required"},
        )

    token = parts[1].strip()
    try:
        response = supabase.auth.get_user(token)
        if response is None or response.user is None:
            raise HTTPException(
                status_code=401,
                detail={"error": "Invalid or expired token", "detail": "No user found for token"},
            )
        return response.user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired token", "detail": str(e)},
        )
