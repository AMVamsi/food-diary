"""
Patch supabase before any app module is imported.

supabase.py raises RuntimeError at module level when SUPABASE_URL /
SUPABASE_SECRET_KEY are absent, and calls create_client() which may
validate the URL / key against the Supabase SDK.  We set dummy env vars
and mock create_client so the module loads cleanly in a test environment.
"""

import os
from unittest.mock import MagicMock, patch

# Must be set before app.db.supabase is first imported
os.environ.setdefault("SUPABASE_URL", "https://placeholder.supabase.co")
os.environ.setdefault("SUPABASE_SECRET_KEY", "placeholder-secret-key")

# Patch supabase.create_client for the duration of the initial import so the
# module-level call in supabase.py returns a MagicMock instead of making real
# network / validation calls.
with patch("supabase.create_client", return_value=MagicMock()):
    import app.db.supabase  # noqa: F401 — force module into sys.modules
