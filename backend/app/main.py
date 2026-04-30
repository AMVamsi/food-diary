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

app.include_router(auth.router,     prefix="/auth",    tags=["auth"])
app.include_router(profile.router,  prefix="/profile", tags=["profile"])
app.include_router(diary.router,    prefix="/diary",   tags=["diary"])
app.include_router(logmeal.router,  prefix="/logmeal", tags=["logmeal"])

@app.get("/health")
def health():
    return {"status": "ok"}
