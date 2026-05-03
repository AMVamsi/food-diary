import axios from 'axios'
import { useAuthStore } from '../store/auth'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000'

export const client = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
})

client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    // Only set JSON content-type for non-FormData bodies.
    // FormData requests (file uploads) must not have Content-Type pre-set —
    // the native XHR layer sets multipart/form-data with the boundary automatically.
    if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json'
    }
    return config
})

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config
        const status: number | undefined = error.response?.status

        // ── 401 handling ──────────────────────────────────────────────────────
        if (status === 401) {
            if (originalRequest && !originalRequest._retried) {
                // First 401: attempt a silent token refresh and retry once.
                originalRequest._retried = true
                try {
                    const { data, error: refreshError } = await supabase.auth.refreshSession()
                    if (refreshError || !data.session) {
                        throw refreshError ?? new Error('No session after refresh')
                    }
                    const newToken = data.session.access_token
                    const userId = data.session.user.id
                    await useAuthStore.getState().setAuth(newToken, userId)
                    originalRequest.headers.Authorization = `Bearer ${newToken}`
                    return client(originalRequest)
                } catch {
                    // Refresh failed — session is dead.
                }
            }
            // Either: refresh failed above, OR this is the retried request and it
            // also got 401 (backend still rejecting after a fresh token). In both
            // cases the session cannot be recovered — clear auth so RootNavigator
            // switches to AuthStack (Login). No toast; the redirect is the feedback.
            await useAuthStore.getState().clearAuth()
            return Promise.reject(error)
        }

        // ── Global toast feedback for other error classes ──────────────────────
        if (status === 429) {
            showToast('Too many requests — please wait a moment', 'warning')
        } else if (status !== undefined && status >= 500) {
            showToast('Something went wrong — please try again', 'error')
        } else if (error.response === undefined) {
            // No response object — network is unreachable
            showToast('No internet connection', 'error')
        }

        return Promise.reject(error)
    }
)
