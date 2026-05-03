import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Button from '../components/Button'
import ErrorMessage from '../components/ErrorMessage'
import Input from '../components/Input'
import PickerField from '../components/PickerField'
import { client } from '../api/client'
import { useAuthStore } from '../store/auth'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

const SEX_OPTIONS = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
]

const GOAL_OPTIONS = [
    { label: 'Weight loss', value: 'weight_loss' },
    { label: 'Muscle gain', value: 'muscle_gain' },
    { label: 'Being healthier', value: 'being_healthier' },
    { label: 'Other', value: 'other' },
]

const DIET_OPTIONS = [
    { label: 'Unrestricted', value: 'unrestricted' },
    { label: 'Vegan', value: 'vegan' },
    { label: 'Vegetarian', value: 'vegetarian' },
    { label: 'Pescetarian', value: 'pescetarian' },
]

const ACTIVITY_OPTIONS = [
    { label: 'Sedentary', value: 'sedentary' },
    { label: 'Lightly active', value: 'lightly_active' },
    { label: 'Moderately active', value: 'moderately_active' },
    { label: 'Very active', value: 'very_active' },
]

function getBmiColor(bmi: number): string {
    if (bmi < 18.5) return colors.bmiUnderweight
    if (bmi < 25.0) return colors.bmiNormal
    if (bmi < 30.0) return colors.bmiOverweight
    return colors.bmiObese
}

function hexToRgba(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export default function ProfileScreen() {
    const insets = useSafeAreaInsets()
    const { clearAuth } = useAuthStore()

    // Form fields
    const [age, setAge] = useState('')
    const [sex, setSex] = useState<string | null>(null)
    const [weightKg, setWeightKg] = useState('')
    const [heightCm, setHeightCm] = useState('')
    const [goal, setGoal] = useState<string | null>(null)
    const [dietaryPreference, setDietaryPreference] = useState<string | null>(null)
    const [activityLevel, setActivityLevel] = useState<string | null>(null)

    // Computed
    const [bmi, setBmi] = useState<number | null>(null)

    // UI state
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    useEffect(() => {
        const w = parseFloat(weightKg)
        const h = parseFloat(heightCm)
        if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
            const hm = h / 100
            setBmi(Math.round((w / (hm * hm)) * 10) / 10)
        } else {
            setBmi(null)
        }
    }, [weightKg, heightCm])

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await client.get('/profile')
            const data = res.data
            setAge(data.age != null ? String(data.age) : '')
            setSex(data.sex ?? null)
            setWeightKg(data.weight_kg != null ? String(data.weight_kg) : '')
            setHeightCm(data.height_cm != null ? String(data.height_cm) : '')
            setGoal(data.goal ?? null)
            setDietaryPreference(data.dietary_preference ?? null)
            setActivityLevel(data.activity_level ?? null)
        } catch (err: unknown) {
            const apiErr = err as { response?: { status?: number } }
            if (apiErr.response?.status !== 404) {
                // 404 is expected for new users — not an error state
                setError('Failed to load profile. Please try again.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setError(null)
        setSuccessMessage(null)

        const w = parseFloat(weightKg)
        const h = parseFloat(heightCm)
        const a = parseInt(age, 10)

        if (weightKg && (isNaN(w) || w <= 0)) {
            setError('Weight must be a positive number')
            return
        }
        if (heightCm && (isNaN(h) || h <= 0)) {
            setError('Height must be a positive number')
            return
        }
        if (age && (isNaN(a) || a <= 0 || a > 120)) {
            setError('Age must be between 1 and 120')
            return
        }

        setIsSaving(true)
        try {
            const payload: Record<string, unknown> = {}
            if (age) payload.age = a
            if (sex) payload.sex = sex
            if (weightKg) payload.weight_kg = w
            if (heightCm) payload.height_cm = h
            if (goal) payload.goal = goal
            if (dietaryPreference) payload.dietary_preference = dietaryPreference
            if (activityLevel) payload.activity_level = activityLevel

            await client.put('/profile', payload)
            setSuccessMessage('Profile saved successfully')
            setTimeout(() => setSuccessMessage(null), 3000)
        } catch (err: unknown) {
            const apiErr = err as { response?: { status?: number } }
            if (apiErr.response?.status === 422) {
                setError('Please check your inputs and try again.')
            } else {
                setError('Failed to save profile. Please try again.')
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleSignOut = async () => {
        await clearAuth()
    }

    if (isLoading) {
        return (
            <LinearGradient
                colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.flex}
            >
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.gradientEnd} size="large" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </LinearGradient>
        )
    }

    const bmiColor = bmi !== null ? getBmiColor(bmi) : null

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex}
        >
            <LinearGradient
                colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingTop: insets.top + spacing.lg,
                            paddingBottom: insets.bottom + spacing.xxxl,
                        },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header row */}
                    <View style={styles.headerRow}>
                        <Text style={styles.screenTitle}>Profile</Text>
                        {bmi !== null && bmiColor !== null && (
                            <View
                                style={[
                                    styles.bmiBadge,
                                    {
                                        backgroundColor: hexToRgba(bmiColor, 0.15),
                                        borderColor: bmiColor,
                                    },
                                ]}
                            >
                                <Text style={[styles.bmiText, { color: bmiColor }]}>
                                    BMI {bmi}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Success banner */}
                    {successMessage !== null && (
                        <View style={styles.successBanner}>
                            <Text style={styles.successText}>{successMessage}</Text>
                        </View>
                    )}

                    {/* Error message */}
                    <View style={styles.errorMargin}>
                        <ErrorMessage message={error} />
                    </View>

                    {/* Body measurements card */}
                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>Body measurements</Text>
                        <View style={styles.rowGap}>
                            <View style={styles.flex}>
                                <Input
                                    label="Weight (kg)"
                                    value={weightKg}
                                    onChangeText={setWeightKg}
                                    placeholder="70"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.flex}>
                                <Input
                                    label="Height (cm)"
                                    value={heightCm}
                                    onChangeText={setHeightCm}
                                    placeholder="175"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        <Input
                            label="Age"
                            value={age}
                            onChangeText={setAge}
                            placeholder="25"
                            keyboardType="numeric"
                        />
                        <PickerField
                            label="Sex"
                            value={sex}
                            options={SEX_OPTIONS}
                            onSelect={setSex}
                            placeholder="Select"
                        />
                    </View>

                    {/* Goals & lifestyle card */}
                    <View style={[styles.card, styles.cardSpacing]}>
                        <Text style={styles.sectionLabel}>Goals & lifestyle</Text>
                        <PickerField
                            label="Goal"
                            value={goal}
                            options={GOAL_OPTIONS}
                            onSelect={setGoal}
                            placeholder="Select your goal"
                        />
                        <PickerField
                            label="Dietary preference"
                            value={dietaryPreference}
                            options={DIET_OPTIONS}
                            onSelect={setDietaryPreference}
                            placeholder="Select"
                        />
                        <PickerField
                            label="Activity level"
                            value={activityLevel}
                            options={ACTIVITY_OPTIONS}
                            onSelect={setActivityLevel}
                            placeholder="Select"
                        />
                    </View>

                    {/* Save button */}
                    <View style={styles.saveButtonWrapper}>
                        <Button
                            title="Save profile"
                            variant="primary"
                            loading={isSaving}
                            onPress={handleSave}
                        />
                    </View>

                    {/* Sign out */}
                    <View style={styles.signOutWrapper}>
                        <Button
                            title="Sign out"
                            variant="ghost"
                            onPress={handleSignOut}
                        />
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    scrollContent: {
        paddingHorizontal: spacing.xxl,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    bmiBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    bmiText: {
        fontSize: 13,
        fontWeight: '600',
    },
    successBanner: {
        backgroundColor: colors.successBannerBg,
        borderWidth: 1,
        borderColor: colors.successBannerBorder,
        borderRadius: 10,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md + 2,
        marginTop: spacing.lg,
    },
    successText: {
        ...typography.body,
        color: colors.successBannerText,
    },
    errorMargin: {
        marginTop: spacing.lg,
    },
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: spacing.lg,
        marginTop: spacing.xl,
    },
    cardSpacing: {
        marginTop: 14,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.textLabel,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 14,
    },
    rowGap: {
        flexDirection: 'row',
        gap: 12,
    },
    saveButtonWrapper: {
        marginTop: spacing.xxl,
    },
    signOutWrapper: {
        marginTop: spacing.md,
    },
})
