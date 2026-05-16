"""Integration tests for the /diary router.

Uses FastAPI TestClient with:
  - app.dependency_overrides to bypass JWT authentication
  - unittest.mock.patch to replace the Supabase client with a MagicMock
    so no real network calls are made
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.middleware.auth_guard import get_current_user


class _FakeUser:
    """Minimal stand-in for the Supabase User object returned by get_current_user."""

    id = "user-111"


def _fake_get_current_user() -> _FakeUser:
    return _FakeUser()


@pytest.fixture(autouse=True)
def override_auth():
    """Replace get_current_user for every test in this module."""
    app.dependency_overrides[get_current_user] = _fake_get_current_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# ── GET /diary ─────────────────────────────────────────────────────────────


def test_get_diary_groups_entries_by_date_and_sums_kcal(client: TestClient) -> None:
    """Two entries on the same date must be grouped under one key and their
    kcal values summed into total_kcal."""
    row1 = {
        "id": "e1",
        "user_id": "user-111",
        "entry_type": "manual",
        "food_name": "Apple",
        "kcal": 95.0,
        "grams": 182.0,
        "image_url": None,
        "notes": None,
        "logged_at": "2024-01-15T10:00:00",
        "occasion": None,
    }
    row2 = {
        "id": "e2",
        "user_id": "user-111",
        "entry_type": "manual",
        "food_name": "Banana",
        "kcal": 105.0,
        "grams": 118.0,
        "image_url": None,
        "notes": None,
        "logged_at": "2024-01-15T12:00:00",
        "occasion": None,
    }

    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        row1,
        row2,
    ]

    with patch("app.routers.diary.supabase", mock_sb):
        response = client.get("/diary")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    day = body[0]
    assert day["date"] == "2024-01-15"
    assert day["total_kcal"] == pytest.approx(200.0)
    assert len(day["entries"]) == 2


# ── DELETE /diary/{id} ────────────────────────────────────────────────────


def test_delete_entry_owned_by_different_user_returns_404(client: TestClient) -> None:
    """The endpoint must return 404 when the entry exists but belongs to a
    different user, to avoid leaking whether an entry exists."""
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "user-999"}  # different from the fake user "user-111"
    ]

    with patch("app.routers.diary.supabase", mock_sb):
        response = client.delete("/diary/some-entry-id")

    assert response.status_code == 404


# ── POST /diary ───────────────────────────────────────────────────────────


def test_post_diary_creates_entry_and_returns_201(client: TestClient) -> None:
    """A valid POST body must return 201 with a DiaryEntryOut whose fields
    match the row returned by the Supabase insert mock."""
    db_row = {
        "id": "entry-abc",
        "user_id": "user-111",
        "entry_type": "manual",
        "food_name": "Rice",
        "kcal": 200.0,
        "grams": 150.0,
        "image_url": None,
        "notes": None,
        "logged_at": "2024-01-15T18:00:00",
        "occasion": None,
    }

    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [db_row]

    payload = {
        "entry_type": "manual",
        "food_name": "Rice",
        "kcal": 200.0,
        "amount": 150.0,
        "unit": "g",
    }

    with patch("app.routers.diary.supabase", mock_sb):
        response = client.post("/diary", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == "entry-abc"
    assert body["food_name"] == "Rice"
    assert body["kcal"] == pytest.approx(200.0)
    assert body["amount"] == pytest.approx(150.0)
    assert body["user_id"] == "user-111"
