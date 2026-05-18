"""Tests for the get_current_user dependency in app.middleware.auth_guard.

Calls get_current_user directly as a function (bypassing FastAPI's DI machinery)
and mocks only app.middleware.auth_guard.supabase — nothing else.
No network calls are made.
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.middleware.auth_guard import get_current_user


# ── Valid token ───────────────────────────────────────────────────────────────
# Covers auth_guard.py lines 28-38: supabase.auth.get_user called, user returned


class TestGetCurrentUserValidToken:
    def test_valid_bearer_token_returns_user_object(self):
        mock_user = MagicMock()
        mock_user.id = "user-abc-123"
        mock_response = MagicMock()
        mock_response.user = mock_user

        mock_supabase = MagicMock()
        mock_supabase.auth.get_user.return_value = mock_response

        with patch("app.middleware.auth_guard.supabase", mock_supabase):
            result = get_current_user(authorization="Bearer valid-token-here")

        assert result.id == "user-abc-123"
        mock_supabase.auth.get_user.assert_called_once_with("valid-token-here")

    def test_token_is_stripped_of_whitespace_before_passing_to_supabase(self):
        mock_user = MagicMock()
        mock_user.id = "user-xyz"
        mock_response = MagicMock()
        mock_response.user = mock_user

        mock_supabase = MagicMock()
        mock_supabase.auth.get_user.return_value = mock_response

        with patch("app.middleware.auth_guard.supabase", mock_supabase):
            get_current_user(authorization="Bearer   mytoken  ")

        mock_supabase.auth.get_user.assert_called_once_with("mytoken")


# ── Supabase returns null user ────────────────────────────────────────────────
# Covers auth_guard.py lines 30-36: response.user is None → 401


class TestGetCurrentUserNullUser:
    def test_supabase_response_with_none_user_raises_401(self):
        mock_response = MagicMock()
        mock_response.user = None

        mock_supabase = MagicMock()
        mock_supabase.auth.get_user.return_value = mock_response

        with patch("app.middleware.auth_guard.supabase", mock_supabase):
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(authorization="Bearer bad-token")

        assert exc_info.value.status_code == 401

    def test_supabase_returns_none_response_raises_401(self):
        mock_supabase = MagicMock()
        mock_supabase.auth.get_user.return_value = None

        with patch("app.middleware.auth_guard.supabase", mock_supabase):
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(authorization="Bearer some-token")

        assert exc_info.value.status_code == 401


# ── Supabase raises exception ─────────────────────────────────────────────────
# Covers auth_guard.py lines 41-47: any exception from supabase → 401


class TestGetCurrentUserSupabaseException:
    def test_supabase_exception_raises_401(self):
        mock_supabase = MagicMock()
        mock_supabase.auth.get_user.side_effect = Exception("Connection refused")

        with patch("app.middleware.auth_guard.supabase", mock_supabase):
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(authorization="Bearer broken-token")

        assert exc_info.value.status_code == 401


# ── Missing Authorization header ──────────────────────────────────────────────
# Covers auth_guard.py lines 8-14: authorization is None → 401


class TestGetCurrentUserMissingHeader:
    def test_none_authorization_header_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization=None)

        assert exc_info.value.status_code == 401


# ── Malformed Authorization header ───────────────────────────────────────────
# Covers auth_guard.py lines 17-24: header does not match "Bearer <token>" → 401


class TestGetCurrentUserMalformedHeader:
    def test_non_bearer_scheme_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization="Token abc123")

        assert exc_info.value.status_code == 401

    def test_bearer_with_no_token_raises_401(self):
        # "Bearer " splits to ["Bearer"] — len != 2 → 401
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization="Bearer")

        assert exc_info.value.status_code == 401

    def test_single_word_header_raises_401(self):
        # "justoneword" splits to ["justoneword"] — len != 2 → 401
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization="justoneword")

        assert exc_info.value.status_code == 401
