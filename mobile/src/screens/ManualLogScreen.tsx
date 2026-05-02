import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    ListRenderItemInfo,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import Button from '../components/Button'
import ErrorMessage from '../components/ErrorMessage'
import Input from '../components/Input'
import { client } from '../api/client'
import { useDiaryStore } from '../store/diary'
import type { Ingredient } from '../store/diary'
import type { MainTabParamList } from '../navigation/MainTabs'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

// ─── Types ───────────────────────────────────────────────────────────────────

type Nav = BottomTabNavigationProp<MainTabParamList, 'Manual Log'>

type CatalogueItem = {
    id: number
    name: string
}

type BasketItem = {
    ingredient: CatalogueItem
    grams: string
}

interface NutrientValue {
    quantity: number
    unit: string
}

interface NutrientBag {
    totalNutritients?: Record<string, NutrientValue>
    totalNutrients?: Record<string, NutrientValue>
}

interface ComputeNutrientsResponse {
    nutritional_info?: NutrientBag
}

function extractKcal(data: ComputeNutrientsResponse): number {
    const bag = data.nutritional_info
    const kcal =
        bag?.totalNutritients?.['ENERC_KCAL']?.quantity ??
        bag?.totalNutrients?.['ENERC_KCAL']?.quantity
    return typeof kcal === 'number' ? kcal : 0
}

function mapApiError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { status?: number; data?: { detail?: string } } }).response
        // 404 means the endpoint is not deployed yet — show the fallback, not "Not Found"
        if (res?.status === 404) return fallback
        const detail = res?.data?.detail
        if (typeof detail === 'string') return detail
    }
    return fallback
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ManualLogScreen() {
    const insets = useSafeAreaInsets()
    const navigation = useNavigation<Nav>()
    const { ingredients: storeIngredients, setIngredients } = useDiaryStore()

    const [catalogue, setCatalogue] = useState<CatalogueItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [basket, setBasket] = useState<BasketItem[]>([])
    const [isCalculating, setIsCalculating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [calculatedKcal, setCalculatedKcal] = useState<number | null>(null)
    const [calcError, setCalcError] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)

    // ── Catalogue loading ─────────────────────────────────────────────────────

    const loadCatalogue = useCallback(async () => {
        setIsLoading(true)
        setLoadError(null)
        try {
            const res = await client.get<{ ingredients: CatalogueItem[] }>(
                '/logmeal/ingredients',
            )
            const items = res.data.ingredients
            setCatalogue(items)
            // Store type expects full Ingredient; endpoint returns only id+name.
            // Cast is safe: this screen reads only id and name from the store.
            setIngredients(items as unknown as Ingredient[], new Date().toISOString())
        } catch (err: unknown) {
            setLoadError(
                mapApiError(err, 'Could not load ingredient catalogue — tap Retry'),
            )
        } finally {
            setIsLoading(false)
        }
    }, [setIngredients])

    useEffect(() => {
        if (storeIngredients.length > 0) {
            setCatalogue(storeIngredients.map(({ id, name }) => ({ id, name })))
            setIsLoading(false)
            return
        }
        loadCatalogue()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // only on mount — storeIngredients excluded intentionally

    // ── Filtering ─────────────────────────────────────────────────────────────

    const filteredIngredients = useMemo<CatalogueItem[]>(() => {
        if (!searchQuery.trim()) return []
        const q = searchQuery.toLowerCase()
        return catalogue.filter(item => item.name.toLowerCase().includes(q))
    }, [catalogue, searchQuery])

    const basketIds = useMemo<Set<number>>(
        () => new Set(basket.map(b => b.ingredient.id)),
        [basket],
    )

    // ── Basket actions ────────────────────────────────────────────────────────

    const addToBasket = useCallback((item: CatalogueItem) => {
        setBasket(prev => {
            if (prev.some(b => b.ingredient.id === item.id)) return prev
            return [...prev, { ingredient: item, grams: '100' }]
        })
    }, [])

    const removeFromBasket = useCallback((id: number) => {
        setBasket(prev => prev.filter(b => b.ingredient.id !== id))
        setCalculatedKcal(null)
    }, [])

    const updateGrams = useCallback((id: number, value: string) => {
        setBasket(prev =>
            prev.map(b => (b.ingredient.id === id ? { ...b, grams: value } : b)),
        )
        setCalculatedKcal(null)
    }, [])

    // ── Calculate ─────────────────────────────────────────────────────────────

    const handleCalculate = useCallback(async () => {
        if (basket.length === 0) return
        setIsCalculating(true)
        setCalcError(null)
        try {
            const res = await client.post<ComputeNutrientsResponse>(
                '/logmeal/compute_nutrients',
                {
                    ingredients: basket.map(b => ({
                        id: b.ingredient.id,
                        amount: parseFloat(b.grams) || 0,
                    })),
                },
            )
            setCalculatedKcal(extractKcal(res.data))
        } catch (err: unknown) {
            setCalcError(
                mapApiError(err, 'Nutrition calculation failed — please try again'),
            )
        } finally {
            setIsCalculating(false)
        }
    }, [basket])

    // ── Save ──────────────────────────────────────────────────────────────────

    const handleSave = useCallback(async () => {
        if (calculatedKcal === null) return
        setIsSaving(true)
        setSaveError(null)
        try {
            const totalGrams = basket.reduce(
                (sum, b) => sum + (parseFloat(b.grams) || 0),
                0,
            )
            await client.post('/diary', {
                entry_type: 'manual',
                food_name: basket.map(b => b.ingredient.name).join(' + '),
                kcal: calculatedKcal,
                amount: totalGrams,
                unit: 'g',
                logged_at: new Date().toISOString(),
            })
            setBasket([])
            setSearchQuery('')
            setCalculatedKcal(null)
            setCalcError(null)
            setSaveError(null)
            navigation.navigate('Diary')
        } catch (err: unknown) {
            setSaveError(
                mapApiError(err, 'Could not save diary entry — please try again'),
            )
        } finally {
            setIsSaving(false)
        }
    }, [basket, calculatedKcal, navigation])

    // ── Cancel / clear ────────────────────────────────────────────────────────

    const handleCancel = useCallback(() => {
        setBasket([])
        setSearchQuery('')
        setCalculatedKcal(null)
        setCalcError(null)
        setSaveError(null)
    }, [])

    // ── Render helpers ────────────────────────────────────────────────────────

    const renderIngredient = useCallback(
        ({ item }: ListRenderItemInfo<CatalogueItem>) => {
            const inBasket = basketIds.has(item.id)
            return (
                <TouchableOpacity
                    style={[
                        styles.ingredientRow,
                        inBasket ? styles.ingredientRowSelected : null,
                    ]}
                    onPress={() => addToBasket(item)}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.ingredientName,
                            inBasket ? styles.ingredientNameSelected : null,
                        ]}
                        numberOfLines={2}
                    >
                        {item.name}
                    </Text>
                    {inBasket ? <Text style={styles.checkMark}>✓</Text> : null}
                </TouchableOpacity>
            )
        },
        [basketIds, addToBasket],
    )

    const renderBasketItem = useCallback(
        (item: BasketItem) => (
            <View key={item.ingredient.id} style={styles.basketItem}>
                <Text style={styles.basketName} numberOfLines={2}>
                    {item.ingredient.name}
                </Text>
                <View style={styles.basketRow}>
                    <View style={styles.gramInputWrapper}>
                        <Input
                            label="Grams"
                            value={item.grams}
                            onChangeText={v => updateGrams(item.ingredient.id, v)}
                            keyboardType="decimal-pad"
                            autoCapitalize="none"
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeFromBasket(item.ingredient.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </View>
        ),
        [updateGrams, removeFromBasket],
    )

    const renderListFooter = useCallback(
        () => (
            <View style={styles.basketSection}>
                <Text style={styles.sectionTitle}>Basket</Text>
                {basket.length === 0 ? (
                    <Text style={styles.emptyBasket}>
                        Search and tap ingredients to add them here
                    </Text>
                ) : (
                    basket.map(renderBasketItem)
                )}
                {calculatedKcal !== null ? (
                    <View style={styles.kcalCard}>
                        <Text style={styles.kcalLabel}>Total Energy</Text>
                        <Text style={styles.kcalValue}>
                            {Math.round(calculatedKcal)} kcal
                        </Text>
                    </View>
                ) : null}
                <ErrorMessage message={calcError} />
                <ErrorMessage message={saveError} />
            </View>
        ),
        [basket, calculatedKcal, calcError, saveError, renderBasketItem],
    )

    // ── Loading / error states ────────────────────────────────────────────────

    if (isLoading) {
        return (
            <LinearGradient
                colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
                style={styles.fill}
            >
                <View
                    style={[
                        styles.centered,
                        { paddingTop: insets.top, paddingBottom: insets.bottom },
                    ]}
                >
                    <ActivityIndicator size="large" color={colors.gradientMid} />
                    <Text style={styles.loadingText}>Loading ingredient catalogue…</Text>
                </View>
            </LinearGradient>
        )
    }

    if (loadError) {
        return (
            <LinearGradient
                colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
                style={styles.fill}
            >
                <View
                    style={[
                        styles.centered,
                        { paddingTop: insets.top, paddingBottom: insets.bottom },
                    ]}
                >
                    <ErrorMessage message={loadError} />
                    <Button title="Retry" onPress={loadCatalogue} />
                </View>
            </LinearGradient>
        )
    }

    // ── Main screen ───────────────────────────────────────────────────────────

    return (
        <LinearGradient
            colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
            style={styles.fill}
        >
            <KeyboardAvoidingView
                style={styles.fill}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.fill, { paddingTop: insets.top }]}>

                    {/* Search bar — pinned above the list */}
                    <View style={styles.searchBar}>
                        <View style={styles.searchInputWrapper}>
                            <Input
                                label="Search ingredients"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="e.g. chicken, rice, banana"
                                autoCapitalize="none"
                            />
                        </View>
                        {basket.length > 0 ? (
                            <TouchableOpacity
                                style={styles.clearBtn}
                                onPress={handleCancel}
                            >
                                <Text style={styles.clearBtnText}>Clear</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {/* Ingredient results + basket */}
                    <FlatList
                        data={filteredIngredients}
                        keyExtractor={item => String(item.id)}
                        renderItem={renderIngredient}
                        ListEmptyComponent={
                            searchQuery.trim().length > 0 ? (
                                <Text style={styles.noResults}>No ingredients found</Text>
                            ) : null
                        }
                        ListFooterComponent={renderListFooter}
                        keyboardShouldPersistTaps="handled"
                        style={styles.fill}
                        contentContainerStyle={styles.listContent}
                    />

                    {/* Fixed footer — Calculate + Save */}
                    <View
                        style={[
                            styles.footer,
                            { paddingBottom: insets.bottom + spacing.sm },
                        ]}
                    >
                        <View style={styles.footerRow}>
                            <View style={styles.footerBtn}>
                                <Button
                                    title="Calculate kcal"
                                    onPress={handleCalculate}
                                    loading={isCalculating}
                                    disabled={
                                        basket.length === 0 || isCalculating || isSaving
                                    }
                                />
                            </View>
                            <View style={styles.footerBtn}>
                                <Button
                                    title="Save to diary"
                                    onPress={handleSave}
                                    loading={isSaving}
                                    disabled={
                                        calculatedKcal === null || isSaving || isCalculating
                                    }
                                />
                            </View>
                        </View>
                    </View>

                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    fill: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.md,
        textAlign: 'center',
    },

    // Search bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xs,
        gap: spacing.sm,
    },
    searchInputWrapper: {
        flex: 1,
    },
    clearBtn: {
        paddingBottom: spacing.md,
    },
    clearBtnText: {
        ...typography.link,
        color: colors.gradientMid,
    },

    // Results list
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.xs,
        borderRadius: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    ingredientRowSelected: {
        borderColor: colors.gradientMid,
        backgroundColor: colors.inputFocused,
    },
    ingredientName: {
        ...typography.body,
        color: colors.textPrimary,
        flex: 1,
    },
    ingredientNameSelected: {
        color: colors.gradientMid,
    },
    checkMark: {
        ...typography.body,
        color: colors.gradientMid,
        marginLeft: spacing.sm,
    },
    noResults: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingVertical: spacing.xl,
    },

    // Basket
    basketSection: {
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    sectionTitle: {
        ...typography.fieldLabel,
        color: colors.textLabel,
        marginBottom: spacing.md,
    },
    emptyBasket: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingVertical: spacing.xl,
    },
    basketItem: {
        backgroundColor: colors.surfaceStrong,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    basketName: {
        ...typography.body,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    basketRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    gramInputWrapper: {
        flex: 1,
    },
    removeBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: colors.errorBackground,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    removeBtnText: {
        ...typography.body,
        color: colors.errorText,
        fontSize: 13,
    },

    // kcal result card
    kcalCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.lg,
        marginTop: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gradientMid,
    },
    kcalLabel: {
        ...typography.fieldLabel,
        color: colors.textLabel,
        marginBottom: spacing.xs,
    },
    kcalValue: {
        ...typography.screenTitle,
        color: colors.gradientStart,
    },

    // Footer
    footer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bgGradientStart,
    },
    footerRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    footerBtn: {
        flex: 1,
    },
})
