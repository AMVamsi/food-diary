from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import auth, diary, logmeal, profile

app = FastAPI(title="Food Diary API")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom exception handler to ensure HTTPException with dict detail returns top-level error/detail fields."""
    if isinstance(exc.detail, dict):
        # If detail is already a dict with error/detail keys, return it at top level
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail,
        )
    # Otherwise, wrap the detail in the standard ErrorResponse format
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "Request failed", "detail": str(exc.detail)},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])

profile_router = getattr(profile, "router", None)
if profile_router is not None:
    app.include_router(profile_router, prefix="/profile", tags=["profile"])

diary_router = getattr(diary, "router", None)
if diary_router is not None:
    app.include_router(diary_router, prefix="/diary", tags=["diary"])

logmeal_router = getattr(logmeal, "router", None)
if logmeal_router is not None:
    app.include_router(logmeal_router, prefix="/logmeal", tags=["logmeal"])


@app.get("/health")
def health() -> dict:
    """Liveness probe — returns 200 OK when the process is running."""
    return {"status": "ok"}


@app.get("/health/db")
async def health_db() -> dict:
    """Readiness probe — verifies the Supabase connection is reachable."""
    try:
        from app.db.supabase import supabase

        supabase.table("profiles").select("count").execute()
        return {"status": "ok", "supabase": "connected"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
