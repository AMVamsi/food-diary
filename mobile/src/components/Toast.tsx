import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export type ToastVariant = 'error' | 'warning' | 'info'

interface ToastHandle {
    show: (message: string, variant?: ToastVariant) => void
}

// Module-level ref — assigned when ToastProvider mounts, called from anywhere.
const _ref = React.createRef<ToastHandle>()

export function showToast(message: string, variant: ToastVariant = 'error'): void {
    _ref.current?.show(message, variant)
}

const VARIANT_BG: Record<ToastVariant, string> = {
    error: 'rgba(239, 68, 68, 0.92)',
    warning: 'rgba(245, 158, 11, 0.92)',
    info: 'rgba(6, 182, 212, 0.92)',
}

const VARIANT_TEXT: Record<ToastVariant, string> = {
    error: colors.errorText,
    warning: '#fde68a',
    info: '#ecfeff',
}

const ToastInner = forwardRef<ToastHandle, object>((_, ref) => {
    const insets = useSafeAreaInsets()
    const opacity = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(16)).current
    const [message, setMessage] = useState('')
    const [variant, setVariant] = useState<ToastVariant>('error')
    const [visible, setVisible] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useImperativeHandle(ref, () => ({
        show(msg: string, v: ToastVariant = 'error') {
            if (timer.current) clearTimeout(timer.current)

            setMessage(msg)
            setVariant(v)
            setVisible(true)

            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
            ]).start()

            timer.current = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: 16, duration: 220, useNativeDriver: true }),
                ]).start(() => setVisible(false))
            }, 3000)
        },
    }))

    if (!visible) return null

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.container,
                {
                    bottom: insets.bottom + 80,
                    backgroundColor: VARIANT_BG[variant],
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            <Text style={[styles.message, { color: VARIANT_TEXT[variant] }]} numberOfLines={3}>
                {message}
            </Text>
        </Animated.View>
    )
})

ToastInner.displayName = 'Toast'

export function ToastProvider() {
    return <ToastInner ref={_ref} />
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        borderRadius: 10,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 8,
    },
    message: {
        ...typography.body,
        textAlign: 'center',
    },
})
