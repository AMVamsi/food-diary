import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import LogoMark from './LogoMark';
import Input from './Input';
import Button from './Button';
import ErrorMessage from './ErrorMessage';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface AuthScreenLayoutProps {
  title: string;
  subtitle: string;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  error: string | null;
  isLoading: boolean;
  buttonTitle: string;
  onSubmit: () => void;
  linkText: string;
  linkButtonText: string;
  onLinkPress: () => void;
}

export default function AuthScreenLayout({
  title,
  subtitle,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  error,
  isLoading,
  buttonTitle,
  onSubmit,
  linkText,
  linkButtonText,
  onLinkPress,
}: AuthScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}
    >
      {/*
       * automaticallyAdjustKeyboardInsets (RN 0.71+) handles keyboard
       * avoidance natively without JS layout passes, eliminating the
       * stutter caused by KeyboardAvoidingView + LinearGradient repaints.
       */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <LogoMark />

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <ErrorMessage message={error} />

        <Input
          label="Email"
          value={email}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          hasError={!!error}
          editable={!isLoading}
        />

        <Input
          label="Password"
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          hasError={!!error}
          editable={!isLoading}
          rightIcon={
            <TouchableOpacity
              onPress={onTogglePassword}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textLabel} />
            </TouchableOpacity>
          }
        />

        <Button title={buttonTitle} onPress={onSubmit} loading={isLoading} />

        <View style={styles.spacer} />

        <View style={styles.row}>
          <Text style={styles.rowText}>{linkText}</Text>
          <TouchableOpacity
            onPress={onLinkPress}
            disabled={isLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaskedView maskElement={<Text style={styles.linkText}>{linkButtonText}</Text>}>
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.linkText, styles.linkHidden]}>{linkButtonText}</Text>
              </LinearGradient>
            </MaskedView>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl + 4, // 28px = spacing.xxl (24) + 4
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  spacer: {
    height: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  rowText: {
    ...typography.link,
    color: colors.textSecondary,
  },
  linkText: {
    ...typography.link,
    color: 'black',
  },
  linkHidden: {
    opacity: 0,
  },
});
