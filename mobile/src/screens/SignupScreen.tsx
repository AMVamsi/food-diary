import React, { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import LogoMark from '../components/LogoMark'
import Input from '../components/Input'
import Button from '../components/Button'
import ErrorMessage from '../components/ErrorMessage'
import { client } from '../api/client'
import { useAuthStore } from '../store/auth'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import type { AuthStackParamList } from '../navigation/AuthStack'

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>

export default function SignupScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets()
    const setAuth = useAuthStore((s) => s.setAuth)

    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [showPassword, setShowPassword] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const handleSignup = async () => {
        const trimmedEmail = email.trim()

        if (!trimmedEmail.includes('@') || trimmedEmail.length === 0) {
            setError('Please enter a valid email address')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setError(null)
        setIsLoading(true)

        try {
            const res = await client.post('/auth/register', {
                email: trimmedEmail.toLowerCase(),
                password,
            })
            if (res.status === 202) {
                setError('Check your inbox — we sent you a confirmation email. Confirm it then sign in.')
                return
            }
            await setAuth(res.data.access_token, res.data.user_id)
        } catch (err: unknown) {
            const status =
                typeof err === 'object' && err !== null && 'response' in err
                    ? (err as { response?: { status?: number } }).response?.status
                    : undefined

            if (status === 409)
                setError('This email is already registered. Try signing in instead.')
            else if (status === 400)
                setError('Registration failed. Please check your details.')
            else if (status === 422)
                setError('Please enter a valid email and password')
            else setError('Something went wrong. Please try again.')
        } finally {
            setIsLoading(false)
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
                    { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                automaticallyAdjustKeyboardInsets
            >
                <LogoMark />

                <Text style={styles.title}>Create account</Text>
                <Text style={styles.subtitle}>Start tracking your meals</Text>

                <ErrorMessage message={error} />

                <Input
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    hasError={!!error}
                    editable={!isLoading}
                />

                <Input
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    hasError={!!error}
                    editable={!isLoading}
                    rightIcon={
                        <TouchableOpacity
                            onPress={() => setShowPassword((v) => !v)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Feather
                                name={showPassword ? 'eye-off' : 'eye'}
                                size={18}
                                color={colors.textLabel}
                            />
                        </TouchableOpacity>
                    }
                />

                <Button
                    title="Create account"
                    onPress={handleSignup}
                    loading={isLoading}
                />

                <View style={styles.spacer} />

                <View style={styles.row}>
                    <Text style={styles.rowText}>Have an account?</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        disabled={isLoading}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaskedView
                            maskElement={<Text style={styles.linkText}>Sign in</Text>}
                        >
                            <LinearGradient
                                colors={[colors.gradientStart, colors.gradientEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={[styles.linkText, styles.linkHidden]}>
                                    Sign in
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
        paddingHorizontal: 28,
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
    },
    spacer: {
        height: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
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
})
