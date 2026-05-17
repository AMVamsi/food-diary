"""Tests for the cache-staleness logic used by logmeal.py.

The staleness check is inline in the router — reproduced here directly.
It should ideally be extracted to a shared utility so the router and these
tests can import a single source of truth.
"""

from datetime import UTC, datetime, timedelta


def is_stale(fetched_at: datetime) -> bool:
    """Reproduce the inline staleness check from logmeal.py."""
    return datetime.now(UTC) - fetched_at > timedelta(hours=24)


def test_not_stale_at_23_hours():
    assert is_stale(datetime.now(UTC) - timedelta(hours=23)) is False


def test_stale_at_25_hours():
    assert is_stale(datetime.now(UTC) - timedelta(hours=25)) is True


def test_stale_at_24_hours_1_minute():
    assert is_stale(datetime.now(UTC) - timedelta(hours=24, minutes=1)) is True
