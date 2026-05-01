from pydantic import BaseModel, EmailStr, Field


class AuthRequest(BaseModel):
    """Credentials payload sent by the client for register and login endpoints."""

    email: EmailStr
    password: str = Field(..., min_length=6)


class AuthResponse(BaseModel):
    """Successful auth response carrying the bearer token and resolved user id."""

    access_token: str
    token_type: str = "bearer"
    user_id: str


class RegisterPendingResponse(BaseModel):
    """Returned when Supabase requires email confirmation before a session is issued."""

    message: str = "Email confirmation required"
    detail: str = "Please check your email to confirm your account before signing in."


class ErrorResponse(BaseModel):
    """Standard error shape returned by all failure responses across the API."""

    error: str
    detail: str
