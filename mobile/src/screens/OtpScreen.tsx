import React, { useEffect, useRef, useState } from 'react'
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Button from '../components/Button'
import ErrorMessage from '../components/ErrorMessage'
import Input from '../components/Input'
import LogoMark from '../components/LogoMark'
import { client } from '../api/client'
import { useAuthStore } from '../store/auth'
import type { AuthStackParamList } from '../navigation/AuthStack'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

const RESEND_COOLDOWN = 30

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>

export default function OtpScreen({ navigation, route }: Props) {
    const { email } = route.params
    const setAuth = useAuthStore((s) => s.setAuth)
    const insets = useSafeAreaInsets()

    const [code, setCode] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cooldown, setCooldown] = useState(0)

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const clearCooldownInterval = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
    }

    useEffect(() => {
        return () => {
            clearCooldownInterval()
        }
    }, [])

    const startCooldown = () => {
        clearCooldownInterval()
        setCooldown(RESEND_COOLDOWN)
        const nextInterval = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(nextInterval)
                    if (intervalRef.current === nextInterval) {
                        intervalRef.current = null
                    }
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        intervalRef.current = nextInterval
    }

    const handleVerify = async () => {
        const trimmed = code.trim()
        if (trimmed.length !== 6) {
            setError('Please enter the 6-digit code from your email')
            return
        }
        setError(null)
        setIsLoading(true)
        try {
            const res = await client.post('/auth/verify-otp', {
                email,
                token: trimmed,
            })
            await setAuth(res.data.access_token, res.data.user_id)
        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } }
            const status = axiosErr.response?.status
            const detail = axiosErr.response?.data?.detail
            if (status === 400) {
                setError(detail ?? 'Invalid or expired code. Tap "Resend code" to get a new one.')
            } else if (status === 401) {
                setError('Session expired — tap "Resend code" to get a fresh code.')
            } else if (status === 429) {
                setError('Too many attempts. Please wait a few minutes and try again.')
            } else {
                setError(detail ?? 'Verification failed. Please try again.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleResend = async () => {
        if (cooldown > 0 || isResending) return
        setError(null)
        setIsResending(true)
        try {
            await client.post('/auth/resend-otp', { email })
            startCooldown()
        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } }
            const status = axiosErr.response?.status
            const detail = axiosErr.response?.data?.detail
            if (status === 429) {
                setError('Email rate limit reached. Please wait a few minutes before requesting another code.')
                startCooldown()
            } else if (status === 501) {
                setError(detail ?? 'Resend not supported — please go back and sign up again.')
            } else {
                setError(detail ?? 'Could not resend the code. Please try again.')
            }
        } finally {
            setIsResending(false)
        }
    }

    return (
        <LinearGradient
            colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.flex}
        >
            <ScrollView
                style={styles.flex}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: insets.top + spacing.xxl,
                        paddingBottom: insets.bottom + spacing.xxl,
                    },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                automaticallyAdjustKeyboardInsets
            >
                <LogoMark />

                <Text style={styles.title}>Check your inbox</Text>
                <Text style={styles.subtitle}>
                    {'We sent a 6-digit code to\n'}
                    <Text style={styles.emailHighlight}>{email}</Text>
                </Text>

                <ErrorMessage message={error} />

                <Input
                    label="Verification code"
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    placeholder="123456"
                    hasError={!!error}
                    editable={!isLoading}
                />

                <Button title="Verify" onPress={handleVerify} loading={isLoading} />

                <View style={styles.spacer} />

                {/* Resend row */}
                <View style={styles.row}>
                    <Text style={styles.rowText}>Didn't get it?</Text>
                    {cooldown > 0 ? (
                        <Text style={styles.cooldownText}>Resend in {cooldown}s</Text>
                    ) : (
                        <TouchableOpacity
                            onPress={handleResend}
                            disabled={isResending}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <MaskedView
                                maskElement={
                                    <Text
                                        style={[
                                            styles.linkText,
                                            isResending && styles.dimmed,
                                        ]}
                                    >
                                        Resend code
                                    </Text>
                                }
                            >
                                <LinearGradient
                                    colors={[colors.gradientStart, colors.gradientEnd]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={[styles.linkText, styles.linkHidden]}>
                                        Resend code
                                    </Text>
                                </LinearGradient>
                            </MaskedView>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Back row */}
                <View style={styles.row}>
                    <Text style={styles.rowText}>Wrong email?</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Signup')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaskedView
                            maskElement={<Text style={styles.linkText}>Go back</Text>}
                        >
                            <LinearGradient
                                colors={[colors.gradientStart, colors.gradientEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={[styles.linkText, styles.linkHidden]}>
                                    Go back
                                </Text>
                            </LinearGradient>
                        </MaskedView>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xxl + 4,
    },
    title: {
        ...typography.screenTitle,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.subtitle,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xxxl,
        marginTop: spacing.sm,
    },
    emailHighlight: {
        ...typography.subtitle,
        color: colors.textPrimary,
    },
    spacer: {
        height: spacing.xl,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        marginTop: spacing.sm,
    },
    rowText: {
        ...typography.link,
        color: colors.textSecondary,
    },
    linkText: {
        ...typography.link,
        color: 'black',
    },
    linkHidden: {
        opacity: 0,
    },
    cooldownText: {
        ...typography.link,
        color: colors.textLabel,
    },
    dimmed: {
        opacity: 0.4,
    },
})
