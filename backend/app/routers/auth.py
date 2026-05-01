from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from gotrue.errors import AuthApiError

from app.db.supabase import supabase
from app.models.schemas import AuthRequest, AuthResponse, RegisterPendingResponse

router = APIRouter()


@router.post("/register", response_model=None, responses={
    200: {"model": AuthResponse},
    202: {"model": RegisterPendingResponse},
})
def register(body: AuthRequest) -> JSONResponse:
    """Register a new user via Supabase Auth and return a bearer token.

    Returns 202 when Supabase email confirmation is enabled — user is created
    but no session is issued until the email link is clicked.
    """
    try:
        response = supabase.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
        user = response.user
        session = response.session

        if user is None:
            raise HTTPException(
                status_code=400,
                detail={"error": "Registration failed", "detail": "No user returned"},
            )

        if session is None:
            # Supabase email confirmation is enabled — not an error, just pending
            return JSONResponse(
                status_code=202,
                content=RegisterPendingResponse().model_dump(),
            )

        return JSONResponse(
            status_code=200,
            content=AuthResponse(
                access_token=session.access_token,
                user_id=str(user.id),
            ).model_dump(),
        )
    except HTTPException:
        raise
    except AuthApiError as e:
        message = str(e).lower()
        if "already registered" in message or "already exists" in message:
            raise HTTPException(
                status_code=409,
                detail={"error": "Email already registered", "detail": str(e)},
            )
        raise HTTPException(
            status_code=400,
            detail={"error": "Registration failed", "detail": str(e)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Registration failed", "detail": str(e)},
        )


@router.post("/login", response_model=AuthResponse)
def login(body: AuthRequest) -> AuthResponse:
    """Authenticate an existing user and return a bearer token."""
    try:
        response = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
        user = response.user
        session = response.session
        if user is None or session is None:
            raise HTTPException(
                status_code=401,
                detail={"error": "Invalid credentials", "detail": "Authentication failed"},
            )
        return AuthResponse(
            access_token=session.access_token,
            user_id=str(user.id),
        )
    except HTTPException:
        raise
    except AuthApiError as e:
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid credentials", "detail": str(e)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Login failed", "detail": str(e)},
        )
