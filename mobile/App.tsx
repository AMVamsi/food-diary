import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import RootNavigator from './src/navigation/RootNavigator'
import { ToastProvider } from './src/components/Toast'

export default function App() {
  return (
    <SafeAreaProvider>
      <RootNavigator />
      <ToastProvider />
    </SafeAreaProvider>
  )
}