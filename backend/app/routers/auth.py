from fastapi import APIRouter, HTTPException
from gotrue.errors import AuthApiError

from app.db.supabase import supabase
from app.models.schemas import AuthRequest, AuthResponse

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
def register(body: AuthRequest) -> AuthResponse:
    """Register a new user via Supabase Auth and return a bearer token."""
    try:
        response = supabase.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
        user = response.user
        session = response.session

        # Handle case where user is created but no session (email confirmation enabled)
        if user is None:
            raise HTTPException(
                status_code=400,
                detail={"error": "Registration failed", "detail": "No user returned"},
            )

        if session is None:
            # User created but requires email confirmation
            raise HTTPException(
                status_code=202,
                detail={"error": "Email confirmation required", "detail": "Please check your email to confirm your account before logging in"},
            )

        return AuthResponse(
            access_token=session.access_token,
            user_id=str(user.id),
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
