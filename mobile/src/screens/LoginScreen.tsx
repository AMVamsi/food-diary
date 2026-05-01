import React from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import AuthScreenLayout from '../components/AuthScreenLayout'
import { client } from '../api/client'
import { useAuthStore } from '../store/auth'
import { useAuthForm } from '../hooks/useAuthForm'
import type { AuthStackParamList } from '../navigation/AuthStack'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Props) {
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

    const handleLogin = async () => {
        const validation = validateForm()
        if (!validation.isValid) {
            setError(validation.error)
            return
        }

        setError(null)
        setIsLoading(true)

        try {
            const res = await client.post('/auth/login', {
                email: email.trim().toLowerCase(),
                password,
            })
            await setAuth(res.data.access_token, res.data.user_id)
        } catch (err: unknown) {
            const status =
                typeof err === 'object' && err !== null && 'response' in err
                    ? (err as { response?: { status?: number } }).response?.status
                    : undefined

            if (status === 401) setError('Incorrect email or password')
            else if (status === 422) setError('Please enter a valid email and password')
            else setError('Something went wrong. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AuthScreenLayout
            title="Welcome back"
            subtitle="Sign in to your food diary"
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            showPassword={showPassword}
            onTogglePassword={togglePasswordVisibility}
            error={error}
            isLoading={isLoading}
            buttonTitle="Sign in"
            onSubmit={handleLogin}
            linkText="No account?"
            linkButtonText="Sign up"
            onLinkPress={() => navigation.navigate('Signup')}
        />
    )
}
