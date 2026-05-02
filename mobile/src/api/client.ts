import axios from 'axios'
import { useAuthStore } from '../store/auth'
import { supabase } from '../lib/supabase'

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

        // Attempt a silent token refresh on the first 401, then retry once.
        // _retried flag prevents an infinite loop if the refreshed token is also rejected.
        if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
            originalRequest._retried = true

            try {
                const { data, error: refreshError } = await supabase.auth.refreshSession()
                if (refreshError || !data.session) {
                    throw refreshError ?? new Error('No session after refresh')
                }

                const newToken = data.session.access_token
                const userId = data.session.user.id

                // Update the store and SecureStore so the new token persists across restarts.
                await useAuthStore.getState().setAuth(newToken, userId)

                // Patch the header on the stalled request and retry it.
                originalRequest.headers.Authorization = `Bearer ${newToken}`
                return client(originalRequest)
            } catch {
                // Refresh failed — token is truly invalid. Force sign-out.
                await useAuthStore.getState().clearAuth()
            }
        }

        return Promise.reject(error)
    }
)
