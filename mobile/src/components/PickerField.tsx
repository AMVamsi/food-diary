import React, { useState } from 'react'
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

interface PickerOption {
    label: string
    value: string
}

interface PickerFieldProps {
    label: string
    value: string | null
    options: PickerOption[]
    onSelect: (value: string) => void
    placeholder?: string
}

export default function PickerField({
    label,
    value,
    options,
    onSelect,
    placeholder,
}: PickerFieldProps) {
    const [visible, setVisible] = useState(false)
    const insets = useSafeAreaInsets()

    const selectedLabel = options.find((o) => o.value === value)?.label ?? null

    const handleSelect = (v: string) => {
        onSelect(v)
        setVisible(false)
    }

    return (
        <View style={styles.wrapper}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={styles.field}
                onPress={() => setVisible(true)}
                activeOpacity={0.75}
                hitSlop={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
                <Text
                    style={[
                        styles.fieldText,
                        selectedLabel ? styles.fieldTextSelected : styles.fieldTextPlaceholder,
                    ]}
                    numberOfLines={1}
                >
                    {selectedLabel ?? placeholder ?? 'Select'}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.textLabel} />
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                />
                <View
                    style={[
                        styles.sheet,
                        { paddingBottom: insets.bottom + spacing.lg },
                    ]}
                >
                    {/* Title row */}
                    <View style={styles.titleRow}>
                        <Text style={styles.titleText}>{label}</Text>
                        <TouchableOpacity
                            onPress={() => setVisible(false)}
                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            style={styles.closeButton}
                        >
                            <Feather name="x" size={20} color={colors.textLabel} />
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    <FlatList
                        data={options}
                        keyExtractor={(item) => item.value}
                        renderItem={({ item }) => {
                            const isSelected = item.value === value
                            return (
                                <TouchableOpacity
                                    style={styles.optionRow}
                                    onPress={() => handleSelect(item.value)}
                                    activeOpacity={0.7}
                                >
                                    {isSelected ? (
                                        <MaskedView
                                            style={styles.maskContainer}
                                            maskElement={
                                                <View style={styles.maskWrapper}>
                                                    <Text style={styles.optionTextMask}>
                                                        {item.label}
                                                    </Text>
                                                </View>
                                            }
                                        >
                                            <LinearGradient
                                                colors={[
                                                    colors.gradientStart,
                                                    colors.gradientMid,
                                                    colors.gradientEnd,
                                                ]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.gradientFill}
                                            >
                                                <Text
                                                    style={[
                                                        styles.optionTextMask,
                                                        styles.hiddenText,
                                                    ]}
                                                >
                                                    {item.label}
                                                </Text>
                                            </LinearGradient>
                                        </MaskedView>
                                    ) : (
                                        <Text style={styles.optionTextUnselected}>
                                            {item.label}
                                        </Text>
                                    )}
                                    {isSelected && (
                                        <Feather
                                            name="check"
                                            size={16}
                                            color={colors.gradientEnd}
                                        />
                                    )}
                                </TouchableOpacity>
                            )
                        }}
                    />
                </View>
            </Modal>
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
    field: {
        height: 46,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.inputBackground,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        justifyContent: 'space-between',
    },
    fieldText: {
        flex: 1,
        ...typography.body,
        marginRight: spacing.sm,
    },
    fieldTextSelected: {
        color: colors.textPrimary,
    },
    fieldTextPlaceholder: {
        color: colors.textPlaceholder,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    sheet: {
        backgroundColor: colors.surfaceStrong,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.lg,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textLabel,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    closeButton: {
        minWidth: 44,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        minHeight: 44,
    },
    maskContainer: {
        flex: 1,
        marginRight: spacing.sm,
    },
    maskWrapper: {
        backgroundColor: 'transparent',
    },
    optionTextMask: {
        ...typography.body,
        fontSize: 15,
        color: 'black',
    },
    gradientFill: {
        justifyContent: 'center',
    },
    hiddenText: {
        opacity: 0,
    },
    optionTextUnselected: {
        ...typography.body,
        fontSize: 15,
        color: colors.textSecondary,
        flex: 1,
    },
})
