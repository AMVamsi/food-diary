import React from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import AuthScreenLayout from '../components/AuthScreenLayout'
import { client } from '../api/client'
import { useAuthStore } from '../store/auth'
import { useAuthForm } from '../hooks/useAuthForm'
import type { AuthStackParamList } from '../navigation/AuthStack'

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>

export default function SignupScreen({ navigation }: Props) {
    const setAuth = useAuthStore((s) => s.setAuth)
    const {
        email,
        setEmail,
        password,
        setPassword,
        showPassword,
        togglePasswordVisibility,
        isLoading,
        setIsLoading,
        error,
        setError,
        validateForm,
    } = useAuthForm()

    const handleSignup = async () => {
        const validation = validateForm()
        if (!validation.isValid) {
            setError(validation.error)
            return
        }

        setError(null)
        setIsLoading(true)

        try {
            const res = await client.post('/auth/register', {
                email: email.trim().toLowerCase(),
                password,
            })
            if (res.status === 202) {
                navigation.navigate('OtpVerify', { email: email.trim().toLowerCase() })
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
            else if (status === 429)
                setError('Too many sign-up attempts. Please wait a few minutes and try again.')
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
        <AuthScreenLayout
            title="Create account"
            subtitle="Start tracking your meals"
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            showPassword={showPassword}
            onTogglePassword={togglePasswordVisibility}
            error={error}
            isLoading={isLoading}
            buttonTitle="Create account"
            onSubmit={handleSignup}
            linkText="Have an account?"
            linkButtonText="Sign in"
            onLinkPress={() => navigation.navigate('Login')}
        />
    )
}
