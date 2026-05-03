from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from gotrue.errors import AuthApiError

from app.db.supabase import supabase
from app.models.schemas import (
    AuthRequest,
    AuthResponse,
    OtpVerifyRequest,
    RegisterPendingResponse,
    ResendOtpRequest,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=None,
    responses={
        200: {"model": AuthResponse},
        202: {"model": RegisterPendingResponse},
    },
)
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
        if e.status == 429:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Too many attempts",
                    "detail": "Email rate limit exceeded. Please wait a few minutes before trying again.",
                },
            )
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
                detail={
                    "error": "Invalid credentials",
                    "detail": "Authentication failed",
                },
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


@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(body: OtpVerifyRequest) -> AuthResponse:
    """Verify a 6-digit OTP sent to the user's email during signup.

    Tries both 'signup' and 'email' OTP types because Supabase project
    configuration determines which type the server uses — both are valid
    for the email-confirmation OTP flow depending on project settings.
    """
    last_error: str = "Code verification failed"

    for otp_type in ("signup", "email"):
        try:
            response = supabase.auth.verify_otp(
                {"email": body.email, "token": body.token, "type": otp_type}
            )
            user = response.user
            session = response.session
            if user is not None and session is not None:
                return AuthResponse(
                    access_token=session.access_token,
                    user_id=str(user.id),
                )
        except HTTPException:
            raise
        except AuthApiError as e:
            if e.status == 429:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Too many attempts",
                        "detail": "Email rate limit exceeded. Please wait a few minutes.",
                    },
                )
            last_error = str(e)
        except Exception as e:
            last_error = str(e)

    raise HTTPException(
        status_code=400,
        detail={"error": "Invalid or expired code", "detail": last_error},
    )


@router.post("/resend-otp", status_code=204)
def resend_otp(body: ResendOtpRequest) -> None:
    """Resend the signup OTP to the user's email address."""
    try:
        if not hasattr(supabase.auth, "resend"):
            # Older gotrue-py versions do not expose resend(); this endpoint
            # does not attempt a fallback and returns 501 instead.
            raise HTTPException(
                status_code=501,
                detail={
                    "error": "Resend unavailable",
                    "detail": "This server version does not support resend. Please restart sign-up.",
                },
            )
        supabase.auth.resend({"type": "signup", "email": body.email})
    except HTTPException:
        raise
    except AuthApiError as e:
        if e.status == 429:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Too many attempts",
                    "detail": "Email rate limit exceeded. Please wait a few minutes before requesting another code.",
                },
            )
        raise HTTPException(
            status_code=400,
            detail={"error": "Resend failed", "detail": str(e)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Resend failed", "detail": str(e)},
        )
