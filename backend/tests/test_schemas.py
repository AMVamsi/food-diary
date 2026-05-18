"""Tests for Pydantic schema validation in app.models.schemas.

Pure tests — no external services, no mocking, no env variables required.
Verifies field validators and Literal type constraints on ProfileIn and DiaryEntryIn.
"""

import pytest
from pydantic import ValidationError

from app.models.schemas import DiaryEntryIn, ProfileIn


# ── ProfileIn.sex ─────────────────────────────────────────────────────────────
# Covers schemas.py lines 67-72: sex_valid validator


class TestProfileInSexField:
    def test_valid_sex_male(self):
        p = ProfileIn(sex="male")
        assert p.sex == "male"

    def test_valid_sex_female(self):
        p = ProfileIn(sex="female")
        assert p.sex == "female"

    def test_valid_sex_other(self):
        p = ProfileIn(sex="other")
        assert p.sex == "other"

    def test_invalid_sex_raises_validation_error(self):
        with pytest.raises(ValidationError):
            ProfileIn(sex="nonbinary")

    def test_sex_none_is_valid(self):
        p = ProfileIn(sex=None)
        assert p.sex is None


# ── ProfileIn.goal ────────────────────────────────────────────────────────────
# Covers schemas.py lines 74-79: goal_valid validator


class TestProfileInGoalField:
    def test_valid_goal_weight_loss(self):
        p = ProfileIn(goal="weight_loss")
        assert p.goal == "weight_loss"

    def test_valid_goal_muscle_gain(self):
        p = ProfileIn(goal="muscle_gain")
        assert p.goal == "muscle_gain"

    def test_invalid_goal_raises_validation_error(self):
        with pytest.raises(ValidationError):
            ProfileIn(goal="get_rich")

    def test_goal_none_is_valid(self):
        p = ProfileIn(goal=None)
        assert p.goal is None


# ── ProfileIn.dietary_preference ──────────────────────────────────────────────
# Covers schemas.py lines 81-89: dietary_preference_valid validator


class TestProfileInDietaryPreference:
    def test_valid_dietary_preference_vegan(self):
        p = ProfileIn(dietary_preference="vegan")
        assert p.dietary_preference == "vegan"

    def test_valid_dietary_preference_unrestricted(self):
        p = ProfileIn(dietary_preference="unrestricted")
        assert p.dietary_preference == "unrestricted"

    def test_invalid_dietary_preference_raises_validation_error(self):
        with pytest.raises(ValidationError):
            ProfileIn(dietary_preference="carnivore")


# ── ProfileIn.activity_level ──────────────────────────────────────────────────
# Covers schemas.py lines 91-97: activity_level_valid validator


class TestProfileInActivityLevel:
    def test_valid_activity_level_sedentary(self):
        p = ProfileIn(activity_level="sedentary")
        assert p.activity_level == "sedentary"

    def test_valid_activity_level_very_active(self):
        p = ProfileIn(activity_level="very_active")
        assert p.activity_level == "very_active"

    def test_invalid_activity_level_raises_validation_error(self):
        with pytest.raises(ValidationError):
            ProfileIn(activity_level="couch_potato")


# ── ProfileIn.weight_kg ───────────────────────────────────────────────────────
# Covers schemas.py lines 52-57: weight_positive validator


class TestProfileInWeightKg:
    def test_positive_weight_is_valid(self):
        p = ProfileIn(weight_kg=70.5)
        assert p.weight_kg == pytest.approx(70.5)

    def test_zero_weight_raises_validation_error(self):
        with pytest.raises(ValidationError):
            ProfileIn(weight_kg=0.0)

    def test_negative_weight_raises_validation_error(self):
        with pytest.raises(ValidationError):
            ProfileIn(weight_kg=-5.0)

    def test_weight_none_is_valid(self):
        p = ProfileIn(weight_kg=None)
        assert p.weight_kg is None


# ── ProfileIn.height_cm ───────────────────────────────────────────────────────
# Covers schemas.py lines 59-64: height_positive validator


class TestProfileInHeightCm:
    def test_positive_height_is_valid(self):
        p = ProfileIn(height_cm=175.0)
        assert p.height_cm == pytest.approx(175.0)

    def test_zero_height_raises_validation_error(self):
        with pytest.raises(ValidationError):
            ProfileIn(height_cm=0.0)

    def test_negative_height_raises_validation_error(self):
        with pytest.raises(ValidationError):
            ProfileIn(height_cm=-10.0)

    def test_height_none_is_valid(self):
        p = ProfileIn(height_cm=None)
        assert p.height_cm is None


# ── DiaryEntryIn.entry_type ───────────────────────────────────────────────────
# Covers schemas.py line 136: Literal["photo", "manual"] constraint


class TestDiaryEntryInEntryType:
    def test_valid_entry_type_photo(self):
        e = DiaryEntryIn(entry_type="photo", food_name="Salad", kcal=100, amount=150)
        assert e.entry_type == "photo"

    def test_valid_entry_type_manual(self):
        e = DiaryEntryIn(entry_type="manual", food_name="Rice", kcal=200, amount=100)
        assert e.entry_type == "manual"

    def test_invalid_entry_type_raises_validation_error(self):
        with pytest.raises(ValidationError):
            DiaryEntryIn(entry_type="scan", food_name="Rice", kcal=200, amount=100)


# ── DiaryEntryIn.unit ─────────────────────────────────────────────────────────
# Covers schemas.py line 141: Literal["g", "ml"] constraint


class TestDiaryEntryInUnit:
    def test_valid_unit_grams(self):
        e = DiaryEntryIn(entry_type="manual", food_name="Rice", kcal=200, amount=100, unit="g")
        assert e.unit == "g"

    def test_valid_unit_ml(self):
        e = DiaryEntryIn(entry_type="manual", food_name="Juice", kcal=50, amount=200, unit="ml")
        assert e.unit == "ml"

    def test_invalid_unit_raises_validation_error(self):
        with pytest.raises(ValidationError):
            DiaryEntryIn(entry_type="manual", food_name="Rice", kcal=200, amount=100, unit="oz")


# ── DiaryEntryIn.kcal ─────────────────────────────────────────────────────────
# Covers schemas.py line 139: Field(ge=0) — zero is valid, negative is not


class TestDiaryEntryInKcal:
    def test_zero_kcal_is_valid(self):
        e = DiaryEntryIn(entry_type="manual", food_name="Water", kcal=0, amount=250)
        assert e.kcal == 0.0

    def test_positive_kcal_is_valid(self):
        e = DiaryEntryIn(entry_type="manual", food_name="Rice", kcal=350.5, amount=100)
        assert e.kcal == pytest.approx(350.5)

    def test_negative_kcal_raises_validation_error(self):
        with pytest.raises(ValidationError):
            DiaryEntryIn(entry_type="manual", food_name="Water", kcal=-1, amount=250)


# ── DiaryEntryIn.amount ───────────────────────────────────────────────────────
# Covers schemas.py line 140: Field(gt=0) — zero and negative are invalid


class TestDiaryEntryInAmount:
    def test_positive_amount_is_valid(self):
        e = DiaryEntryIn(entry_type="manual", food_name="Rice", kcal=200, amount=0.1)
        assert e.amount == pytest.approx(0.1)

    def test_zero_amount_raises_validation_error(self):
        with pytest.raises(ValidationError):
            DiaryEntryIn(entry_type="manual", food_name="Rice", kcal=200, amount=0)

    def test_negative_amount_raises_validation_error(self):
        with pytest.raises(ValidationError):
            DiaryEntryIn(entry_type="manual", food_name="Rice", kcal=200, amount=-100)


# ── DiaryEntryIn.occasion ─────────────────────────────────────────────────────
# Covers schemas.py line 142: Literal["breakfast","lunch","dinner","snack"] | None


class TestDiaryEntryInOccasion:
    def test_valid_occasion_breakfast(self):
        e = DiaryEntryIn(
            entry_type="manual", food_name="Eggs", kcal=150, amount=100, occasion="breakfast"
        )
        assert e.occasion == "breakfast"

    def test_valid_occasion_snack(self):
        e = DiaryEntryIn(
            entry_type="manual", food_name="Apple", kcal=80, amount=150, occasion="snack"
        )
        assert e.occasion == "snack"

    def test_none_occasion_is_valid(self):
        e = DiaryEntryIn(entry_type="manual", food_name="Eggs", kcal=150, amount=100, occasion=None)
        assert e.occasion is None

    def test_invalid_occasion_raises_validation_error(self):
        with pytest.raises(ValidationError):
            DiaryEntryIn(
                entry_type="manual",
                food_name="Eggs",
                kcal=150,
                amount=100,
                occasion="midnight_snack",
            )
