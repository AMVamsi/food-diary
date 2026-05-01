import React from 'react'
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardTypeOptions,
} from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

interface InputProps {
    label: string
    value: string
    onChangeText: (text: string) => void
    placeholder?: string
    secureTextEntry?: boolean
    keyboardType?: KeyboardTypeOptions
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
    hasError?: boolean
    rightIcon?: React.ReactNode
    editable?: boolean
}

export default function Input({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    hasError,
    rightIcon,
    editable = true,
}: InputProps) {
    // No isFocused state — driving focus visuals from JS state causes iOS
    // new-architecture to re-commit the native TextInput node on every render,
    // producing the flicker. Instead we use selectionColor for the accent and
    // keep the border/background static; the cursor colour provides sufficient
    // focus feedback.
    return (
        <View style={styles.wrapper}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={[
                        styles.input,
                        rightIcon ? styles.inputWithIcon : null,
                        hasError ? styles.inputError : styles.inputDefault,
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textPlaceholder}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    editable={editable}
                    selectionColor={colors.gradientMid}
                    underlineColorAndroid="transparent"
                />
                {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.fieldLabel,
        color: colors.textLabel,
        marginBottom: 5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: 46,
        borderRadius: 11,
        borderWidth: 1,
        color: colors.textPrimary,
        paddingHorizontal: 14,
        ...typography.body,
    },
    inputDefault: {
        borderColor: colors.border,
        backgroundColor: colors.inputBackground,
    },
    inputError: {
        borderColor: colors.borderError,
        backgroundColor: colors.inputBackground,
    },
    inputWithIcon: {
        paddingRight: 44,
    },
    rightIcon: {
        position: 'absolute',
        right: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
})
