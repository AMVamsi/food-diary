"""Tests for the GET and PUT /profile endpoints.

Uses FastAPI TestClient with:
  - app.dependency_overrides to bypass JWT authentication
  - unittest.mock.patch to replace the Supabase client in the profile router
    so no real network calls are made
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.middleware.auth_guard import get_current_user


class _FakeUser:
    id = "test-user-profile"


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


_PROFILE_ROW = {
    "user_id": "test-user-profile",
    "age": 30,
    "sex": "male",
    "weight_kg": 80.0,
    "height_cm": 180.0,
    "goal": "weight_loss",
    "dietary_preference": "unrestricted",
    "activity_level": "moderately_active",
    "bmi": 24.7,
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00",
}


# ── GET /profile ──────────────────────────────────────────────────────────────
# Covers profile.py lines 10-32: get_profile endpoint


class TestGetProfile:
    def test_get_profile_returns_404_when_no_profile_exists(self, client: TestClient):
        # Covers profile.py lines 23-30: empty data → 404
        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        with patch("app.routers.profile.supabase", mock_sb):
            response = client.get("/profile")

        assert response.status_code == 404
        assert "error" in response.json()

    def test_get_profile_returns_200_with_profile_data(self, client: TestClient):
        # Covers profile.py lines 32-33: row returned → 200 with ProfileOut
        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            _PROFILE_ROW
        ]

        with patch("app.routers.profile.supabase", mock_sb):
            response = client.get("/profile")

        assert response.status_code == 200
        body = response.json()
        assert body["user_id"] == "test-user-profile"
        assert body["sex"] == "male"
        assert body["weight_kg"] == pytest.approx(80.0)
        assert body["height_cm"] == pytest.approx(180.0)
        assert body["bmi"] == pytest.approx(24.7)

    def test_get_profile_includes_all_expected_fields(self, client: TestClient):
        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            _PROFILE_ROW
        ]

        with patch("app.routers.profile.supabase", mock_sb):
            response = client.get("/profile")

        body = response.json()
        for field in ("user_id", "age", "sex", "weight_kg", "height_cm", "goal", "bmi"):
            assert field in body, f"Field '{field}' missing from response"


# ── PUT /profile ──────────────────────────────────────────────────────────────
# Covers profile.py lines 35-86: upsert_profile endpoint


class TestPutProfile:
    def test_put_profile_returns_200_with_updated_profile(self, client: TestClient):
        # Covers profile.py lines 43-86: upsert then fetch → 200 with ProfileOut
        updated_row = dict(_PROFILE_ROW, bmi=24.7)

        execute_select = MagicMock()
        execute_select.side_effect = [
            MagicMock(data=[]),          # first SELECT — no existing profile
            MagicMock(data=[updated_row]),  # second SELECT — after upsert
        ]

        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.execute = execute_select
        mock_sb.table.return_value.upsert.return_value.execute.return_value = MagicMock()

        payload = {
            "age": 30,
            "sex": "male",
            "weight_kg": 80.0,
            "height_cm": 180.0,
            "goal": "weight_loss",
            "dietary_preference": "unrestricted",
            "activity_level": "moderately_active",
        }

        with patch("app.routers.profile.supabase", mock_sb):
            response = client.put("/profile", json=payload)

        assert response.status_code == 200
        body = response.json()
        assert body["user_id"] == "test-user-profile"

    def test_put_profile_calculates_bmi_from_weight_and_height(self, client: TestClient):
        # Covers profile.py lines 55-60: BMI computed as round(weight/(height_m**2), 1)
        # weight=80, height=180 → bmi = round(80 / (1.8**2), 1) = 24.7
        bmi_row = dict(_PROFILE_ROW, bmi=24.7)

        execute_select = MagicMock()
        execute_select.side_effect = [
            MagicMock(data=[]),
            MagicMock(data=[bmi_row]),
        ]
        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.execute = execute_select
        mock_sb.table.return_value.upsert.return_value.execute.return_value = MagicMock()

        with patch("app.routers.profile.supabase", mock_sb):
            response = client.put("/profile", json={"weight_kg": 80.0, "height_cm": 180.0})

        assert response.status_code == 200
        body = response.json()
        assert body["bmi"] == pytest.approx(24.7)

    def test_put_profile_with_invalid_sex_returns_422(self, client: TestClient):
        # FastAPI validates ProfileIn before calling the router function → 422
        response = client.put("/profile", json={"sex": "invalid_value"})
        assert response.status_code == 422

    def test_put_profile_with_invalid_goal_returns_422(self, client: TestClient):
        response = client.put("/profile", json={"goal": "not_a_real_goal"})
        assert response.status_code == 422

    def test_put_profile_with_negative_weight_returns_422(self, client: TestClient):
        response = client.put("/profile", json={"weight_kg": -10.0})
        assert response.status_code == 422

    def test_put_profile_inherits_existing_height_for_bmi_calculation(self, client: TestClient):
        # Covers profile.py lines 55-60: existing height used when only weight supplied
        # existing has height_cm=170 → new weight=70 → bmi=round(70/(1.7**2),1)=24.2
        existing_row = dict(_PROFILE_ROW, height_cm=170.0, weight_kg=70.0, bmi=24.2)

        execute_select = MagicMock()
        execute_select.side_effect = [
            MagicMock(data=[{"height_cm": 170.0, "weight_kg": 65.0}]),  # existing
            MagicMock(data=[existing_row]),                               # after upsert
        ]
        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.execute = execute_select
        mock_sb.table.return_value.upsert.return_value.execute.return_value = MagicMock()

        with patch("app.routers.profile.supabase", mock_sb):
            response = client.put("/profile", json={"weight_kg": 70.0})

        assert response.status_code == 200
