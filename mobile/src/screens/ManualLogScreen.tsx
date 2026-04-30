import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function ManualLogScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Manual Log — issue #16</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 16, color: '#666' },
})