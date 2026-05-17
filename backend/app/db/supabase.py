import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", "")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in backend/.env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
