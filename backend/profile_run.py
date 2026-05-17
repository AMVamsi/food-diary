"""
One-shot profiling script for POST /logmeal/segment.

Run with pyinstrument from the repo root:

    python -m pyinstrument -o docs/profiling/segment_profile.html \\
        --renderer html backend/profile_run.py

Requires:
    LOGMEAL_API_KEY, SUPABASE_URL, and SUPABASE_SECRET_KEY in backend/.env
    (or set as environment variables before running).

    pip install -r backend/dev-requirements.txt  # pyinstrument
"""

import io
import os
import sys
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Path setup — allow imports from backend/ when run from repo root
# ---------------------------------------------------------------------------
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

# Load .env from backend/ if present
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(BACKEND_DIR, ".env"))
except ImportError:
    pass  # python-dotenv not installed; rely on shell env


# ---------------------------------------------------------------------------
# Minimal in-memory JPEG so the script is self-contained.
# A real profiling run should supply an actual meal photo:
#     IMAGE_PATH=/path/to/meal.jpg python -m pyinstrument ... backend/profile_run.py
# ---------------------------------------------------------------------------
def _make_jpeg() -> bytes:
    image_path = os.getenv("IMAGE_PATH")
    if image_path:
        with open(image_path, "rb") as fh:
            return fh.read()

    # Fall back to Pillow if available (produces a valid 640×480 grey JPEG)
    try:
        from PIL import Image  # type: ignore[import]

        img = Image.new("RGB", (640, 480), color=(180, 200, 160))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        buf.seek(0)
        return buf.read()
    except ImportError:
        pass

    # Last resort: a minimal but valid 1×1 white JPEG (JFIF, no chroma subsampling)
    import base64

    return base64.b64decode(
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDB"
        "kSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAR"
        "CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA"
        "AAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAA"
        "AAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
    )


# ---------------------------------------------------------------------------
# Boot the FastAPI app in-process
# Supabase is mocked so the script works with placeholder DB credentials;
# the real LogMeal API call is NOT mocked — that is the code path being profiled.
# ---------------------------------------------------------------------------
with patch("supabase.create_client", return_value=MagicMock()):
    from fastapi.testclient import TestClient

    from app.main import app
    from app.middleware.auth_guard import get_current_user


class _FakeUser:
    id = "profiling-user"


app.dependency_overrides[get_current_user] = lambda: _FakeUser()
client = TestClient(app, raise_server_exceptions=True)

# ---------------------------------------------------------------------------
# Send one POST /logmeal/segment request
# ---------------------------------------------------------------------------
image_bytes = _make_jpeg()
print(
    f"[profile_run] sending {len(image_bytes):,} bytes to POST /logmeal/segment ...",
    flush=True,
)

response = client.post(
    "/logmeal/segment",
    files={"file": ("meal.jpg", image_bytes, "image/jpeg")},
)

print(f"[profile_run] status = {response.status_code}", flush=True)

if response.status_code == 200:
    data = response.json()
    regions = len(data.get("segmentation_results", []))
    print(f"[profile_run] detected {regions} food region(s)", flush=True)
elif response.status_code == 503:
    print(
        "[profile_run] LOGMEAL_API_KEY not set — set it in backend/.env and retry",
        flush=True,
    )
    sys.exit(1)
else:
    print(f"[profile_run] response body: {response.text[:400]}", flush=True)
