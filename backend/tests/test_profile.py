"""Tests for the BMI formula and colour thresholds used by the profile router
and the ProfileScreen frontend component.

The BMI formula is inline in profile.py:upsert_profile — reproduced here
directly.  It should ideally be extracted to a shared utility function so
both the router and these tests can import it rather than duplicating it.

The colour thresholds mirror getBmiColor() in
mobile/src/screens/ProfileScreen.tsx, which maps BMI ranges to hex values
defined in mobile/src/theme/colors.ts.
"""


def bmi_for(weight_kg: float, height_m: float) -> float:
    """Reproduce the inline BMI formula from profile.py upsert_profile."""
    return round(weight_kg / (height_m**2), 1)


# Colour values from mobile/src/theme/colors.ts
_BMI_UNDERWEIGHT = "#60a5fa"
_BMI_NORMAL = "#4ade80"
_BMI_OVERWEIGHT = "#fbbf24"
_BMI_OBESE = "#f87171"


def bmi_color(bmi: float) -> str:
    """Reproduce getBmiColor() thresholds from ProfileScreen.tsx."""
    if bmi < 18.5:
        return _BMI_UNDERWEIGHT
    if bmi < 25.0:
        return _BMI_NORMAL
    if bmi < 30.0:
        return _BMI_OVERWEIGHT
    return _BMI_OBESE


# ── BMI formula ───────────────────────────────────────────────────────────────


def test_bmi_normal_weight():
    assert bmi_for(70, 1.75) == 22.9


def test_bmi_overweight():
    assert bmi_for(90, 1.80) == 27.8


def test_bmi_underweight():
    assert bmi_for(50, 1.60) == 19.5


# ── BMI colour thresholds ─────────────────────────────────────────────────────


def test_bmi_color_underweight():
    assert bmi_color(18.4) == _BMI_UNDERWEIGHT


def test_bmi_color_boundary_underweight_to_normal():
    # 18.5 is the first value that is NOT underweight
    assert bmi_color(18.5) == _BMI_NORMAL


def test_bmi_color_normal():
    assert bmi_color(22.9) == _BMI_NORMAL


def test_bmi_color_boundary_normal_to_overweight():
    # 25.0 is the first value that is NOT normal
    assert bmi_color(25.0) == _BMI_OVERWEIGHT


def test_bmi_color_overweight():
    assert bmi_color(27.8) == _BMI_OVERWEIGHT


def test_bmi_color_boundary_overweight_to_obese():
    # 30.0 is the first value that is obese
    assert bmi_color(30.0) == _BMI_OBESE


def test_bmi_color_obese():
    assert bmi_color(35.0) == _BMI_OBESE
