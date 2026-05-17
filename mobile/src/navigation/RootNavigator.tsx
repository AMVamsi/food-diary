import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/auth';
import { supabase } from '../lib/supabase';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

export default function RootNavigator() {
  const { token, isLoading, rehydrate } = useAuthStore();

  useEffect(() => {
    rehydrate();

    // Keep useAuthStore in sync with Supabase's background token auto-refresh.
    // Without this, autoRefreshToken silently rotates the JWT but leaves the
    // store holding the stale token, which causes spurious 401s and sign-outs.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        useAuthStore.getState().setAuth(session.access_token, session.user.id);
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [rehydrate]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <NavigationContainer>{token ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
