export const colors = {
    // Background gradient — mirrors your portfolio dark mode exactly
    bgGradientStart: '#0c1426',
    bgGradientMid: '#1e293b',
    bgGradientEnd: '#312e81',

    // Primary accent gradient — from your scrollbar/highlight colors
    gradientStart: '#9AFEFF',
    gradientMid: '#67E8F9',
    gradientEnd: '#06B6D4',

    // Surfaces — semi-transparent slate over the gradient
    surface: 'rgba(30, 41, 59, 0.55)',
    surfaceStrong: 'rgba(30, 41, 59, 0.85)',
    inputBackground: 'rgba(30, 41, 59, 0.55)',
    inputFocused: 'rgba(30, 41, 59, 0.85)',

    // Borders
    border: 'rgba(154, 254, 255, 0.08)',
    borderFocused: 'rgba(154, 254, 255, 0.40)',
    borderError: 'rgba(239, 68, 68, 0.35)',

    // Text
    textPrimary: '#f1f5f9',
    textSecondary: 'rgba(255, 255, 255, 0.30)',
    textPlaceholder: 'rgba(255, 255, 255, 0.18)',
    textOnGradient: '#0c1426',

    // Field labels — muted cyan, same as your scrollbar accent
    textLabel: 'rgba(154, 254, 255, 0.45)',

    // Error
    error: '#ef4444',
    errorText: '#fca5a5',
    errorBackground: 'rgba(239, 68, 68, 0.08)',
    errorBorder: 'rgba(239, 68, 68, 0.25)',

    // Success
    success: '#67E8F9',

    // BMI category colors — used by ProfileScreen badge
    bmiUnderweight: '#60a5fa',
    bmiNormal: '#4ade80',
    bmiOverweight: '#fbbf24',
    bmiObese: '#f87171',

    // Success banner (profile save)
    successBannerBg: 'rgba(74, 222, 128, 0.08)',
    successBannerBorder: 'rgba(74, 222, 128, 0.25)',
    successBannerText: '#4ade80',

    // Overlays
    modalBackdrop: 'rgba(0,0,0,0.88)',
    loadingImageOverlay: 'rgba(12, 20, 38, 0.45)',
} as const