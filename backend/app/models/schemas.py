from typing import List, Literal, Optional
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


class OtpVerifyRequest(BaseModel):
    """OTP verification payload — 6-digit code sent to the user's email."""

    email: EmailStr
    token: str = Field(..., min_length=6, max_length=6)


class ResendOtpRequest(BaseModel):
    """Resend OTP payload — email address to resend the signup code to."""

    email: EmailStr


# ── Diary ─────────────────────────────────────────────────────────────────────


class DiaryEntryIn(BaseModel):
    """Request body for creating a diary entry."""

    entry_type: Literal["photo", "manual"]
    food_name: str = Field(..., min_length=1)
    kcal: float = Field(..., ge=0)
    amount: float = Field(..., gt=0)
    unit: Literal["g", "ml"] = "g"
    occasion: Optional[Literal["breakfast", "lunch", "dinner", "snack"]] = None
    image_url: Optional[str] = None
    logged_at: Optional[str] = None
    notes: Optional[str] = None


class DiaryEntryOut(BaseModel):
    """Single diary entry as returned to the client."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    entry_type: str
    food_name: str
    kcal: float
    amount: float
    unit: Optional[str] = None
    occasion: Optional[str] = None
    image_url: Optional[str] = None
    logged_at: Optional[str] = None
    notes: Optional[str] = None


class DiaryDayOut(BaseModel):
    """Single date group as returned by GET /diary."""

    date: str
    total_kcal: float
    entries: List[DiaryEntryOut]
