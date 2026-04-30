from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, profile, diary, logmeal

app = FastAPI(title="Food Diary API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auth_router = getattr(auth, "router", None)
if auth_router is not None:
    app.include_router(auth_router, prefix="/auth", tags=["auth"])

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
def health():
    return {"status": "ok"}


@app.get("/health/db")
async def health_db():
    try:
        from app.db.supabase import supabase

        result = supabase.table("profiles").select("count").execute()
        return {"status": "ok", "supabase": "connected"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
