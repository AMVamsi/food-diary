import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Image,
    Modal,
    PanResponder,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

import Button from '../components/Button'
import ErrorMessage from '../components/ErrorMessage'
import { client } from '../api/client'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

// ─── Types ───────────────────────────────────────────────────────────────────

type DiaryEntry = {
    id: string
    user_id: string
    entry_type: 'photo' | 'manual'
    food_name: string
    kcal: number
    amount: number
    unit: string | null
    occasion: string | null
    image_url: string | null
    logged_at: string | null
    notes: string | null
}

type DiaryDay = {
    date: string
    total_kcal: number
    entries: DiaryEntry[]
}

type DiarySection = {
    date: string
    total_kcal: number
    data: DiaryEntry[]
}

type ScreenState = 'loading' | 'error' | 'empty' | 'populated'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    // dateStr is YYYY-MM-DD — parse as local midnight to avoid timezone shifts
    const [year, month, day] = dateStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
    })
}

function mapApiError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { detail?: string; error?: string } } }).response
        const detail = res?.data?.detail ?? res?.data?.error
        if (typeof detail === 'string') return detail
    }
    return fallback
}

// ─── SwipeableRow ─────────────────────────────────────────────────────────────
// Swipe-to-delete implemented with React Native built-in PanResponder +
// Animated — no third-party gesture library required.

const DELETE_BTN_WIDTH = 80
const SWIPE_OPEN_THRESHOLD = 50

interface SwipeableRowProps {
    children: React.ReactNode
    onDelete: () => void
    deleting: boolean
    deleteError: string | null
}

function SwipeableRow({ children, onDelete, deleting, deleteError }: SwipeableRowProps) {
    const translateX = useRef(new Animated.Value(0)).current
    const isOpen = useRef(false)

    const close = useCallback(() => {
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
        }).start(() => { isOpen.current = false })
    }, [translateX])

    const open = useCallback(() => {
        Animated.spring(translateX, {
            toValue: -DELETE_BTN_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
        }).start(() => { isOpen.current = true })
    }, [translateX])

    const panResponder = useRef(
        PanResponder.create({
            // Only capture gesture when horizontal movement dominates
            onMoveShouldSetPanResponder: (_, gs) =>
                Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
            onPanResponderMove: (_, gs) => {
                const base = isOpen.current ? -DELETE_BTN_WIDTH : 0
                const next = base + gs.dx
                // Clamp: can only swipe left, max DELETE_BTN_WIDTH
                translateX.setValue(Math.max(-DELETE_BTN_WIDTH, Math.min(0, next)))
            },
            onPanResponderRelease: (_, gs) => {
                const delta = gs.dx
                if (isOpen.current) {
                    // If swiped right enough to close
                    if (delta > SWIPE_OPEN_THRESHOLD) { close() } else { open() }
                } else {
                    // If swiped left enough to open
                    if (delta < -SWIPE_OPEN_THRESHOLD) { open() } else { close() }
                }
            },
            onPanResponderTerminate: () => { close() },
        })
    ).current

    return (
        <View style={swipeStyles.wrapper}>
            {/* Delete action — sits behind the row */}
            <View style={swipeStyles.actionsContainer}>
                <TouchableOpacity
                    style={swipeStyles.deleteAction}
                    onPress={() => { close(); onDelete() }}
                    disabled={deleting}
                    activeOpacity={0.8}
                >
                    {deleting ? (
                        <ActivityIndicator size="small" color={colors.textPrimary} />
                    ) : (
                        <Text style={swipeStyles.deleteActionText}>Delete</Text>
                    )}
                </TouchableOpacity>
            </View>
            <Animated.View
                style={{ transform: [{ translateX }] }}
                {...panResponder.panHandlers}
            >
                {children}
                {deleteError ? (
                    <Text style={swipeStyles.inlineError}>{deleteError}</Text>
                ) : null}
            </Animated.View>
        </View>
    )
}

// ─── EntryRow ────────────────────────────────────────────────────────────────

interface EntryRowProps {
    entry: DiaryEntry
    onThumbnailPress: (uri: string) => void
    onDelete: (id: string) => void
    deleting: boolean
    deleteError: string | null
}

function EntryRow({ entry, onThumbnailPress, onDelete, deleting, deleteError }: EntryRowProps) {
    const hasImage = entry.entry_type === 'photo' && entry.image_url != null

    return (
        <SwipeableRow
            onDelete={() => onDelete(entry.id)}
            deleting={deleting}
            deleteError={deleteError}
        >
            <View style={entryStyles.row}>
                {/* Thumbnail or placeholder — always 40×40 so rows align */}
                {hasImage ? (
                    <TouchableOpacity
                        onPress={() => onThumbnailPress(entry.image_url!)}
                        activeOpacity={0.85}
                    >
                        <Image
                            source={{ uri: entry.image_url! }}
                            style={entryStyles.thumbnail}
                        />
                    </TouchableOpacity>
                ) : (
                    <View style={entryStyles.thumbnailPlaceholder}>
                        <Ionicons
                            name="restaurant-outline"
                            size={20}
                            color={colors.textSecondary}
                        />
                    </View>
                )}

                {/* Text info */}
                <View style={entryStyles.info}>
                    <Text style={entryStyles.foodName} numberOfLines={2}>
                        {entry.food_name}
                    </Text>
                    <Text style={entryStyles.meta}>
                        {entry.amount.toFixed(0)}{entry.unit ?? 'g'}
                        {'  ·  '}
                        {Math.round(entry.kcal)} kcal
                    </Text>
                </View>
            </View>
        </SwipeableRow>
    )
}

// ─── DiaryScreen ─────────────────────────────────────────────────────────────

export default function DiaryScreen() {
    const insets = useSafeAreaInsets()

    const [screenState, setScreenState] = useState<ScreenState>('loading')
    const [days, setDays] = useState<DiaryDay[]>([])
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    // Per-entry delete state
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})

    // Modal state
    const [modalUri, setModalUri] = useState<string | null>(null)

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchDiary = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true)
        } else {
            setScreenState('loading')
        }
        setFetchError(null)

        try {
            const res = await client.get<DiaryDay[]>('/diary')
            const data = res.data
            setDays(data)
            setScreenState(data.length === 0 ? 'empty' : 'populated')
        } catch (err: unknown) {
            const msg = mapApiError(err, 'Could not load diary — tap Retry')
            setFetchError(msg)
            setScreenState('error')
        } finally {
            setRefreshing(false)
        }
    }, [])

    // Re-fetch every time the screen comes into focus so entries added from
    // PhotoLogScreen or ManualLogScreen appear without requiring a manual pull.
    useFocusEffect(
        useCallback(() => {
            fetchDiary()
        }, [fetchDiary])
    )

    // ── Delete ────────────────────────────────────────────────────────────────

    const handleDelete = useCallback(async (id: string) => {
        setDeletingId(id)
        setDeleteErrors(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })

        try {
            await client.delete(`/diary/${id}`)
            // Always refetch — do not mutate local state optimistically
            await fetchDiary()
        } catch (err: unknown) {
            const msg = mapApiError(err, 'Delete failed — please try again')
            setDeleteErrors(prev => ({ ...prev, [id]: msg }))
        } finally {
            setDeletingId(null)
        }
    }, [fetchDiary])

    // ── Sections ──────────────────────────────────────────────────────────────

    const sections = useMemo<DiarySection[]>(
        () => days.map(day => ({ date: day.date, total_kcal: day.total_kcal, data: day.entries })),
        [days],
    )

    // ── Render helpers ────────────────────────────────────────────────────────

    const renderSectionHeader = useCallback(
        ({ section }: { section: DiarySection }) => (
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionDate}>{formatDate(section.date)}</Text>
                <MaskedView
                    maskElement={
                        <View style={styles.kcalMask}>
                            <Text style={styles.kcalText}>
                                {Math.round(section.total_kcal)} kcal
                            </Text>
                        </View>
                    }
                >
                    <LinearGradient
                        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={[styles.kcalText, styles.kcalHidden]}>
                            {Math.round(section.total_kcal)} kcal
                        </Text>
                    </LinearGradient>
                </MaskedView>
            </View>
        ),
        [],
    )

    const renderItem = useCallback(
        ({ item }: { item: DiaryEntry }) => (
            <EntryRow
                entry={item}
                onThumbnailPress={setModalUri}
                onDelete={handleDelete}
                deleting={deletingId === item.id}
                deleteError={deleteErrors[item.id] ?? null}
            />
        ),
        [handleDelete, deletingId, deleteErrors],
    )

    const keyExtractor = useCallback((item: DiaryEntry) => item.id, [])

    const refreshControl = (
        <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDiary(true)}
            tintColor={colors.gradientMid}
            colors={[colors.gradientMid]}
        />
    )

    // ── Screen states ─────────────────────────────────────────────────────────

    if (screenState === 'loading') {
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
                </View>
            </LinearGradient>
        )
    }

    if (screenState === 'error') {
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
                    <ErrorMessage message={fetchError} />
                    <Button title="Retry" onPress={() => fetchDiary()} />
                </View>
            </LinearGradient>
        )
    }

    return (
        <LinearGradient
            colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
            style={styles.fill}
        >
            <View style={[styles.fill, { paddingBottom: insets.bottom }]}>
                {screenState === 'empty' ? (
                    <View style={[styles.centered, { paddingTop: insets.top }]}>
                        <Ionicons
                            name="book-outline"
                            size={48}
                            color={colors.textSecondary}
                            style={styles.emptyIcon}
                        />
                        <Text style={styles.emptyTitle}>Your diary is empty</Text>
                        <Text style={styles.emptyHint}>
                            Log a meal using the Photo Log or Manual Log tabs to get started.
                        </Text>
                    </View>
                ) : (
                    <SectionList<DiaryEntry, DiarySection>
                        sections={sections}
                        keyExtractor={keyExtractor}
                        renderSectionHeader={renderSectionHeader}
                        renderItem={renderItem}
                        refreshControl={refreshControl}
                        contentContainerStyle={[
                            styles.listContent,
                            { paddingTop: insets.top + spacing.sm },
                        ]}
                        stickySectionHeadersEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* ── Full-screen image modal ──────────────────────────────── */}
            <Modal
                visible={modalUri !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setModalUri(null)}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity
                        style={styles.modalClose}
                        onPress={() => setModalUri(null)}
                        activeOpacity={0.8}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Ionicons name="close" size={26} color={colors.textPrimary} />
                    </TouchableOpacity>
                    {modalUri ? (
                        <Image
                            source={{ uri: modalUri }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                    ) : null}
                </View>
            </Modal>
        </LinearGradient>
    )
}

// ─── Swipe styles (used by SwipeableRow) ─────────────────────────────────────

const swipeStyles = StyleSheet.create({
    wrapper: {
        overflow: 'hidden',
    },
    actionsContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: DELETE_BTN_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteAction: {
        width: DELETE_BTN_WIDTH,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.error,
    },
    deleteActionText: {
        ...typography.button,
        color: colors.textPrimary,
    },
    inlineError: {
        ...typography.error,
        color: colors.errorText,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xs,
        backgroundColor: colors.errorBackground,
    },
})

// ─── Entry row styles (used by EntryRow) ─────────────────────────────────────

const entryStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
    },
    thumbnail: {
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    thumbnailPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.inputBackground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
    },
    foodName: {
        ...typography.body,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    meta: {
        ...typography.subtitle,
        color: colors.textSecondary,
    },
})

// ─── Screen styles ────────────────────────────────────────────────────────────

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
    listContent: {
        paddingBottom: spacing.xxxl,
    },

    // Section header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        marginTop: spacing.md,
        marginHorizontal: spacing.lg,
        borderRadius: 10,
        backgroundColor: colors.surfaceStrong,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.xs,
    },
    sectionDate: {
        ...typography.fieldLabel,
        color: colors.textLabel,
    },
    kcalMask: {
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    kcalText: {
        ...typography.body,
        fontWeight: '600',
        color: 'black',
    },
    kcalHidden: {
        opacity: 0,
    },

    // Empty state
    emptyIcon: {
        marginBottom: spacing.lg,
        opacity: 0.5,
    },
    emptyTitle: {
        ...typography.screenTitle,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    emptyHint: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.7,
    },

    // Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalClose: {
        position: 'absolute',
        top: 52,
        right: 20,
        zIndex: 10,
        backgroundColor: colors.surfaceStrong,
        borderRadius: 20,
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalImage: {
        width: '100%',
        height: '80%',
    },
})
