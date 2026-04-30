from fastapi import Header, HTTPException

from app.db.supabase import supabase


async def get_current_user(authorization: str = Header(None)):
    """Reusable FastAPI Depends() that validates a Bearer token via Supabase Auth."""
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"error": "Missing token", "detail": "Authorization header required"},
        )
    token = authorization.split(" ")[1]
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
