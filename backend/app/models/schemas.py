from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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


class ProfileIn(BaseModel):
    """Partial profile update payload — all fields optional, only provided fields are written."""

    age: Optional[int] = None
    sex: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    goal: Optional[str] = None
    dietary_preference: Optional[str] = None
    activity_level: Optional[str] = None

    @field_validator("age")
    @classmethod
    def age_positive(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("age must be greater than 0")
        return v

    @field_validator("weight_kg")
    @classmethod
    def weight_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("weight_kg must be greater than 0")
        return v

    @field_validator("height_cm")
    @classmethod
    def height_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("height_cm must be greater than 0")
        return v

    @field_validator("sex")
    @classmethod
    def sex_valid(cls, v: Optional[str]) -> Optional[str]:
        allowed = ["male", "female", "other"]
        if v is not None and v not in allowed:
            raise ValueError(f"sex '{v}' is not valid; allowed values: {allowed}")
        return v

    @field_validator("goal")
    @classmethod
    def goal_valid(cls, v: Optional[str]) -> Optional[str]:
        allowed = ["weight_loss", "muscle_gain", "being_healthier", "other"]
        if v is not None and v not in allowed:
            raise ValueError(f"goal '{v}' is not valid; allowed values: {allowed}")
        return v

    @field_validator("dietary_preference")
    @classmethod
    def dietary_preference_valid(cls, v: Optional[str]) -> Optional[str]:
        allowed = ["unrestricted", "vegan", "vegetarian", "pescetarian"]
        if v is not None and v not in allowed:
            raise ValueError(
                f"dietary_preference '{v}' is not valid; allowed values: {allowed}"
            )
        return v

    @field_validator("activity_level")
    @classmethod
    def activity_level_valid(cls, v: Optional[str]) -> Optional[str]:
        allowed = ["sedentary", "lightly_active", "moderately_active", "very_active"]
        if v is not None and v not in allowed:
            raise ValueError(
                f"activity_level '{v}' is not valid; allowed values: {allowed}"
            )
        return v


class ProfileOut(BaseModel):
    """Full profile row returned to the client after GET or PUT /profile."""

    model_config = ConfigDict(from_attributes=True)

    user_id: str
    age: Optional[int] = None
    sex: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    goal: Optional[str] = None
    dietary_preference: Optional[str] = None
    activity_level: Optional[str] = None
    bmi: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
