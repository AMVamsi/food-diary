import React from 'react';
import { Text, TouchableOpacity, ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: ButtonProps) {
  const isInactive = disabled || loading;

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        style={styles.ghostWrapper}
        activeOpacity={0.7}
        onPress={onPress}
        disabled={isInactive}
      >
        <MaskedView
          maskElement={
            <View style={styles.ghostMask}>
              <Text style={styles.ghostText}>{title}</Text>
            </View>
          }
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ghostGradient}
          >
            <Text style={[styles.ghostText, styles.ghostTextHidden]}>{title}</Text>
          </LinearGradient>
        </MaskedView>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isInactive}
      style={[styles.primaryWrapper, isInactive ? styles.inactive : null]}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryGradient}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnGradient} />
        ) : (
          <Text style={styles.primaryText}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryWrapper: {
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    ...typography.button,
    color: colors.textOnGradient,
  },
  inactive: {
    opacity: 0.6,
  },
  ghostWrapper: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostMask: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostText: {
    ...typography.button,
    color: 'black',
    textAlign: 'center',
  },
  ghostTextHidden: {
    opacity: 0,
  },
});
