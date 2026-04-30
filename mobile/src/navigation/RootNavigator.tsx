import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useAuthStore } from '../store/auth'
import AuthStack from './AuthStack'
import MainTabs from './MainTabs'

export default function RootNavigator() {
    const { token, isLoading, rehydrate } = useAuthStore()

    useEffect(() => {
        rehydrate()
    }, [])

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return (
        <NavigationContainer>
            {token ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
    )
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
})