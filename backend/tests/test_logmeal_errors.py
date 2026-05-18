"""Tests for error handling branches in the logmeal router.

Error paths verified:
  - httpx.TimeoutException → 504 (segment, confirm, nutrition)
  - httpx.RequestError (network failure) → 502 (segment, confirm, nutrition)
  - LogMeal 401 response → 502 (invalid API key)
  - LogMeal 429 response → 429 (rate limit)
  - LogMeal 400 response → 422 (bad image, segment only)
  - LogMeal 5xx response → 502 (service error)

All tests mock httpx.AsyncClient and override get_current_user.
No real HTTP calls are made.
"""

import io
import os
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.middleware.auth_guard import get_current_user

os.environ.setdefault("LOGMEAL_API_KEY", "test-api-key-for-tests")


class _FakeUser:
    id = "user-logmeal-test"


def _fake_get_current_user() -> _FakeUser:
    return _FakeUser()


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = _fake_get_current_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _make_httpx_class_mock(
    status_code: int | None = None,
    is_success: bool = True,
    json_data: dict | None = None,
    side_effect=None,
) -> MagicMock:
    """Build a mock for `httpx.AsyncClient` usable as an async context manager.

    The mock class, when called (instantiated), returns a context manager whose
    __aenter__ yields a mock client. That client's post/get methods return a
    mock response with the given status_code, or raise side_effect.
    """
    mock_inner = AsyncMock()

    if side_effect is not None:
        mock_inner.post.side_effect = side_effect
        mock_inner.get.side_effect = side_effect
    else:
        mock_response = MagicMock()
        mock_response.status_code = status_code
        mock_response.is_success = is_success
        mock_response.text = ""
        if json_data is not None:
            mock_response.json.return_value = json_data
        mock_inner.post.return_value = mock_response
        mock_inner.get.return_value = mock_response

    mock_cls = MagicMock()
    mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_inner)
    mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
    return mock_cls


# JPEG magic bytes — non-empty so the router doesn't reject with 400
_FAKE_IMAGE = b"\xff\xd8\xff\xe0" + b"\x00" * 64


def _segment_files():
    return {"file": ("meal.jpg", io.BytesIO(_FAKE_IMAGE), "image/jpeg")}


# ── /logmeal/segment error paths ──────────────────────────────────────────────
# Covers logmeal.py lines 60-138: httpx call and status-code checks in segment_image


class TestSegmentErrors:
    def test_segment_returns_504_on_timeout(self, client: TestClient):
        # Covers logmeal.py line 123: httpx.TimeoutException → 504
        mock_cls = _make_httpx_class_mock(side_effect=httpx.TimeoutException("timed out"))
        mock_sb = MagicMock()

        with patch("httpx.AsyncClient", mock_cls), patch("app.routers.logmeal.supabase", mock_sb):
            response = client.post("/logmeal/segment", files=_segment_files())

        assert response.status_code == 504
        assert "error" in response.json()

    def test_segment_returns_502_on_request_error(self, client: TestClient):
        # Covers logmeal.py line 131: httpx.RequestError → 502
        mock_cls = _make_httpx_class_mock(side_effect=httpx.RequestError("network error"))
        mock_sb = MagicMock()

        with patch("httpx.AsyncClient", mock_cls), patch("app.routers.logmeal.supabase", mock_sb):
            response = client.post("/logmeal/segment", files=_segment_files())

        assert response.status_code == 502
        assert "error" in response.json()

    def test_segment_returns_429_on_rate_limit(self, client: TestClient):
        # Covers logmeal.py lines 83-89: status 429 → 429
        mock_cls = _make_httpx_class_mock(status_code=429, is_success=False)
        mock_sb = MagicMock()

        with patch("httpx.AsyncClient", mock_cls), patch("app.routers.logmeal.supabase", mock_sb):
            response = client.post("/logmeal/segment", files=_segment_files())

        assert response.status_code == 429
        assert "error" in response.json()

    def test_segment_returns_502_on_logmeal_server_error(self, client: TestClient):
        # Covers logmeal.py lines 103-110: status >= 500 → 502
        mock_cls = _make_httpx_class_mock(status_code=500, is_success=False)
        mock_sb = MagicMock()

        with patch("httpx.AsyncClient", mock_cls), patch("app.routers.logmeal.supabase", mock_sb):
            response = client.post("/logmeal/segment", files=_segment_files())

        assert response.status_code == 502
        assert "error" in response.json()

    def test_segment_returns_502_on_logmeal_401(self, client: TestClient):
        # Covers logmeal.py lines 74-81: status 401 → 502 (server key invalid)
        mock_cls = _make_httpx_class_mock(status_code=401, is_success=False)
        mock_sb = MagicMock()

        with patch("httpx.AsyncClient", mock_cls), patch("app.routers.logmeal.supabase", mock_sb):
            response = client.post("/logmeal/segment", files=_segment_files())

        assert response.status_code == 502
        assert "error" in response.json()

    def test_segment_returns_422_on_logmeal_400(self, client: TestClient):
        # Covers logmeal.py lines 92-101: status 400 → 422 (bad image format)
        mock_cls = _make_httpx_class_mock(status_code=400, is_success=False)
        mock_sb = MagicMock()

        with patch("httpx.AsyncClient", mock_cls), patch("app.routers.logmeal.supabase", mock_sb):
            response = client.post("/logmeal/segment", files=_segment_files())

        assert response.status_code == 422
        assert "error" in response.json()


# ── /logmeal/confirm error paths ──────────────────────────────────────────────
# Covers logmeal.py lines 203-265: httpx call and error handling in confirm_dish

_VALID_CONFIRM = {
    "imageId": 99999,
    "food_item_position": [0],
    "confirmedClass": [1],
}


class TestConfirmErrors:
    def test_confirm_returns_504_on_timeout(self, client: TestClient):
        # Covers logmeal.py line 251: httpx.TimeoutException → 504
        mock_cls = _make_httpx_class_mock(side_effect=httpx.TimeoutException("timeout"))

        with patch("httpx.AsyncClient", mock_cls):
            response = client.post("/logmeal/confirm", json=_VALID_CONFIRM)

        assert response.status_code == 504
        assert "error" in response.json()

    def test_confirm_returns_502_on_request_error(self, client: TestClient):
        # Covers logmeal.py line 259: httpx.RequestError → 502
        mock_cls = _make_httpx_class_mock(side_effect=httpx.RequestError("unreachable"))

        with patch("httpx.AsyncClient", mock_cls):
            response = client.post("/logmeal/confirm", json=_VALID_CONFIRM)

        assert response.status_code == 502
        assert "error" in response.json()

    def test_confirm_returns_429_on_rate_limit(self, client: TestClient):
        # Covers logmeal.py lines 222-229: status 429 → 429
        mock_cls = _make_httpx_class_mock(status_code=429, is_success=False)

        with patch("httpx.AsyncClient", mock_cls):
            response = client.post("/logmeal/confirm", json=_VALID_CONFIRM)

        assert response.status_code == 429

    def test_confirm_returns_502_on_logmeal_server_error(self, client: TestClient):
        # Covers logmeal.py lines 231-238: status >= 500 → 502
        mock_cls = _make_httpx_class_mock(status_code=500, is_success=False)

        with patch("httpx.AsyncClient", mock_cls):
            response = client.post("/logmeal/confirm", json=_VALID_CONFIRM)

        assert response.status_code == 502

    def test_confirm_returns_502_on_logmeal_401(self, client: TestClient):
        # Covers logmeal.py lines 213-220: status 401 → 502
        mock_cls = _make_httpx_class_mock(status_code=401, is_success=False)

        with patch("httpx.AsyncClient", mock_cls):
            response = client.post("/logmeal/confirm", json=_VALID_CONFIRM)

        assert response.status_code == 502


# ── /logmeal/nutrition error paths ────────────────────────────────────────────
# Covers logmeal.py lines 291-354: httpx call and error handling in get_nutritional_info

_VALID_NUTRITION = {"imageId": 99999}


class TestNutritionErrors:
    def test_nutrition_returns_504_on_timeout(self, client: TestClient):
        # Covers logmeal.py line 340: httpx.TimeoutException → 504
        mock_cls = _make_httpx_class_mock(side_effect=httpx.TimeoutException("timeout"))

        with patch("httpx.AsyncClient", mock_cls):
            response = client.post("/logmeal/nutrition", json=_VALID_NUTRITION)

        assert response.status_code == 504
        assert "error" in response.json()

    def test_nutrition_returns_502_on_request_error(self, client: TestClient):
        # Covers logmeal.py line 347: httpx.RequestError → 502
        mock_cls = _make_httpx_class_mock(side_effect=httpx.RequestError("unreachable"))

        with patch("httpx.AsyncClient", mock_cls):
            response = client.post("/logmeal/nutrition", json=_VALID_NUTRITION)

        assert response.status_code == 502
        assert "error" in response.json()

    def test_nutrition_returns_429_on_rate_limit(self, client: TestClient):
        # Covers logmeal.py lines 309-315: status 429 → 429
        mock_cls = _make_httpx_class_mock(status_code=429, is_success=False)

        with patch("httpx.AsyncClient", mock_cls):
            response = client.post("/logmeal/nutrition", json=_VALID_NUTRITION)

        assert response.status_code == 429

    def test_nutrition_returns_502_on_logmeal_server_error(self, client: TestClient):
        # Covers logmeal.py lines 317-323: status >= 500 → 502
        mock_cls = _make_httpx_class_mock(status_code=500, is_success=False)

        with patch("httpx.AsyncClient", mock_cls):
            response = client.post("/logmeal/nutrition", json=_VALID_NUTRITION)

        assert response.status_code == 502

    def test_nutrition_returns_502_on_logmeal_401(self, client: TestClient):
        # Covers logmeal.py lines 301-308: status 401 → 502
        mock_cls = _make_httpx_class_mock(status_code=401, is_success=False)

        with patch("httpx.AsyncClient", mock_cls):
            response = client.post("/logmeal/nutrition", json=_VALID_NUTRITION)

        assert response.status_code == 502
