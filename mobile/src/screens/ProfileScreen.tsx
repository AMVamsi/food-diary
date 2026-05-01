import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Button from '../components/Button'
import { useAuthStore } from '../store/auth'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'

export default function ProfileScreen() {
    const clearAuth = useAuthStore((s) => s.clearAuth)

    const handleSignOut = async () => {
        await clearAuth()
    }

    return (
        <LinearGradient
            colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.flex}
        >
            <View style={styles.container}>
                <Text style={styles.placeholder}>Profile — issue #10</Text>
                <Text style={styles.heading}>Profile</Text>
                <View style={styles.spacer} />
                <View style={styles.signOutWrapper}>
                    <Button
                        title="Sign out"
                        variant="ghost"
                        onPress={handleSignOut}
                    />
                </View>
            </View>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    placeholder: {
        ...typography.subtitle,
        color: colors.textSecondary,
    },
    heading: {
        ...typography.screenTitle,
        color: colors.textPrimary,
        marginTop: 12,
    },
    spacer: {
        height: 40,
    },
    signOutWrapper: {
        alignSelf: 'stretch',
    },
})
