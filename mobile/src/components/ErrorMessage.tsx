import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

interface ErrorMessageProps {
    message: string | null
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
    if (!message) return null

    return (
        <View style={styles.container}>
            <Text style={styles.text}>{message}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.errorBackground,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: spacing.lg,
    },
    text: {
        ...typography.error,
        color: colors.errorText,
        lineHeight: 18,
    },
})
