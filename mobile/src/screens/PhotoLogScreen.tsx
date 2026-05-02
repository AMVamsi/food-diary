import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Linking,
  StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Camera } from 'expo-camera'

import BboxOverlay from '../components/BboxOverlay'
import Button from '../components/Button'
import ErrorMessage from '../components/ErrorMessage'
import { useAuthStore } from '../store/auth'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecognitionCandidate {
  name: string
  prob: number
}

interface SegmentationRegion {
  contained_bbox: { x: number; y: number; w: number; h: number }
  recognition_results: RecognitionCandidate[]
}

interface ProcessedImageSize {
  width: number
  height: number
}

interface SegmentationResponse {
  imageId: number
  processed_image_size: ProcessedImageSize
  occasion: string
  segmentation_results: SegmentationRegion[]
}

// ─── State machine ───────────────────────────────────────────────────────────

type ScreenState =
  | { phase: 'entry' }
  | { phase: 'loading'; imageUri: string }
  | { phase: 'result'; imageUri: string; response: SegmentationResponse }
  | { phase: 'error'; message: string }

// Tagged error thrown by uploadImage so mapErrorMessage can distinguish
// network failures, timeouts, and HTTP error codes without relying on axios.
class UploadError extends Error {
  constructor(
    public readonly code: 'network' | 'timeout' | 'http',
    public readonly status?: number,
  ) {
    super(code)
    this.name = 'UploadError'
  }
}

function mapErrorMessage(err: unknown): string {
  if (err instanceof UploadError) {
    if (err.code === 'timeout') return 'The upload timed out — please try again'
    if (err.code === 'network') return 'No internet connection — please check your connection'
    const status = err.status
    if (status === 401) return 'Your session has expired — please sign out and sign in again'
    if (status === 400 || status === 422) return 'The photo could not be processed — please try a different image'
    if (status === 429) return 'Too many requests — please wait a moment before trying again'
    if (status === 502) return 'The food recognition service is unavailable — please try again later'
    if (status === 504) return 'The analysis is taking too long — please try again'
    if (status !== undefined && status >= 500) return 'Something went wrong with the food recognition service'
  }
  return 'An unexpected error occurred — please try again'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhotoLogScreen() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  const [screen, setScreen] = useState<ScreenState>({ phase: 'entry' })
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)
  const [galleryPermission, setGalleryPermission] = useState<boolean | null>(null)
  const [permissionDeniedSource, setPermissionDeniedSource] = useState<'camera' | 'gallery' | null>(null)

  const imageDisplayWidth = width - spacing.xxl * 2

  function getDisplayHeight(processedImageSize: ProcessedImageSize): number {
    return imageDisplayWidth * (processedImageSize.height / processedImageSize.width)
  }

  /** Convert any camera/gallery image to a small JPEG before upload.
   *  - iOS camera produces HEIF (.heic) by default which LogMeal rejects.
   *  - Full-resolution HEIC/JPEG files can be 10-20 MB; resizing to 1280 px
   *    brings them under ~500 KB so uploads stay well within the 60 s timeout.
   */
  async function normaliseToJpeg(uri: string): Promise<string> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
    )
    return result.uri
  }

  async function uploadImage(uri: string): Promise<void> {
    const formData = new FormData()
    const filename = uri.split('/').pop() ?? 'meal.jpg'
    formData.append('file', { uri, name: filename, type: 'image/jpeg' } as unknown as Blob)

    const token = useAuthStore.getState().token
    const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

    // Use native fetch instead of axios for this multipart request.
    // axios's FormData detection (instanceof checks) is unreliable on Android/Hermes,
    // causing it to stringify the body to "{}" and set Content-Type: application/json.
    // React Native's fetch handles FormData natively and correctly on both platforms —
    // it automatically sets multipart/form-data with the correct boundary.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60_000)

    let res: Response
    try {
      res = await fetch(`${baseUrl}/logmeal/segment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          // Do NOT set Content-Type — fetch sets multipart/form-data + boundary automatically
        },
        body: formData,
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('[PhotoLog] upload fetch error:', err)
      if (err instanceof Error && err.name === 'AbortError') throw new UploadError('timeout')
      throw new UploadError('network')
    }
    clearTimeout(timeoutId)

    if (!res.ok) {
      console.error('[PhotoLog] upload HTTP error:', res.status)
      throw new UploadError('http', res.status)
    }

    const data: SegmentationResponse = await res.json()
    setScreen({ phase: 'result', imageUri: uri, response: data })
  }

  async function handleCamera(): Promise<void> {
    setPermissionDeniedSource(null)

    let granted = cameraPermission
    if (granted === null) {
      const result = await Camera.requestCameraPermissionsAsync()
      granted = result.status === 'granted'
      setCameraPermission(granted)
    }

    if (!granted) {
      setPermissionDeniedSource('camera')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.85,
      allowsEditing: false,
    })

    if (result.canceled || result.assets.length === 0) return

    const asset = result.assets[0]
    setScreen({ phase: 'loading', imageUri: asset.uri })

    try {
      const jpegUri = await normaliseToJpeg(asset.uri)
      await uploadImage(jpegUri)
    } catch (err) {
      setScreen({ phase: 'error', message: mapErrorMessage(err) })
    }
  }

  async function handleGallery(): Promise<void> {
    setPermissionDeniedSource(null)

    let granted = galleryPermission
    if (granted === null) {
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync()
      granted = result.status === 'granted'
      setGalleryPermission(granted)
    }

    if (!granted) {
      setPermissionDeniedSource('gallery')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.85,
      allowsEditing: false,
    })

    if (result.canceled || result.assets.length === 0) return

    const asset = result.assets[0]
    setScreen({ phase: 'loading', imageUri: asset.uri })

    try {
      const jpegUri = await normaliseToJpeg(asset.uri)
      await uploadImage(jpegUri)
    } catch (err) {
      setScreen({ phase: 'error', message: mapErrorMessage(err) })
    }
  }

  function resetToEntry(): void {
    setPermissionDeniedSource(null)
    setScreen({ phase: 'entry' })
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  const isLoading = screen.phase === 'loading'

  function renderPermissionBanner(): React.ReactNode {
    if (!permissionDeniedSource) return null
    const isCamera = permissionDeniedSource === 'camera'
    const label = isCamera ? 'camera' : 'photo library'
    return (
      <View style={styles.permissionBanner}>
        <Text style={styles.permissionText}>
          {`${isCamera ? 'Camera' : 'Photo library'} access is needed to log a meal. Please grant ${label} permission in your device settings.`}
        </Text>
        <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.settingsLink}>
          <Text style={styles.settingsLinkText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    )
  }

  function renderEntryView(): React.ReactNode {
    return (
      <View style={styles.entryContainer}>
        <Text style={styles.screenTitle}>Log a meal</Text>
        <Text style={[styles.subtitle, { marginBottom: spacing.xxxl }]}>
          Take a photo or choose one from your library to identify the food.
        </Text>

        {renderPermissionBanner()}

        <View style={styles.actionCard}>
          <Text style={styles.actionLabel}>Camera</Text>
          <Text style={styles.actionDescription}>
            Point your camera at the food on your plate.
          </Text>
          <Button
            title="Take a photo"
            onPress={handleCamera}
            disabled={isLoading}
            variant="primary"
          />
        </View>

        <View style={[styles.actionCard, { marginTop: spacing.lg }]}>
          <Text style={styles.actionLabel}>Gallery</Text>
          <Text style={styles.actionDescription}>
            Choose an existing photo from your library.
          </Text>
          <Button
            title="Choose from library"
            onPress={handleGallery}
            disabled={isLoading}
            variant="ghost"
          />
        </View>
      </View>
    )
  }

  function renderLoadingView(imageUri: string): React.ReactNode {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.imageWrapper, { width: imageDisplayWidth }]}>
          <Image
            source={{ uri: imageUri }}
            style={[styles.loadingImage, { width: imageDisplayWidth, height: imageDisplayWidth * 0.75 }]}
            resizeMode="cover"
          />
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.gradientEnd} />
          </View>
        </View>
        <Text style={styles.loadingText}>Analysing your meal…</Text>
      </View>
    )
  }

  function renderRegionCard(region: SegmentationRegion, index: number): React.ReactNode {
    const top5 = region.recognition_results.slice(0, 5)
    return (
      <View key={index} style={styles.regionCard}>
        <Text style={styles.regionCardTitle}>Region {index + 1}</Text>
        {top5.map((candidate, ci) => (
          <View
            key={ci}
            style={[
              styles.candidateRow,
              ci === 0 && styles.candidateRowTop,
            ]}
          >
            <Text
              style={[
                styles.candidateName,
                ci === 0 && styles.candidateNameTop,
              ]}
              numberOfLines={1}
            >
              {candidate.name}
            </Text>
            <Text
              style={[
                styles.candidateProb,
                ci === 0 && styles.candidateProbTop,
              ]}
            >
              {Math.round(candidate.prob * 100)}%
            </Text>
          </View>
        ))}
        {/* #14: wire this button to DishConfirmationScreen, passing region index and top-5 candidates */}
        <TouchableOpacity style={styles.confirmPlaceholder} disabled>
          <Text style={styles.confirmPlaceholderText}>Confirm dish →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  function renderResultView(imageUri: string, response: SegmentationResponse): React.ReactNode {
    const { processed_image_size, segmentation_results } = response
    const displayHeight = getDisplayHeight(processed_image_size)
    const hasRegions = segmentation_results.length > 0

    return (
      <ScrollView
        style={styles.resultScroll}
        contentContainerStyle={[
          styles.resultContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.imageWrapper, { overflow: 'hidden' }]}>
          {hasRegions ? (
            <BboxOverlay
              imageUri={imageUri}
              displayWidth={imageDisplayWidth}
              displayHeight={displayHeight}
              processedImageSize={processed_image_size}
              regions={segmentation_results}
            />
          ) : (
            <Image
              source={{ uri: imageUri }}
              style={{ width: imageDisplayWidth, height: displayHeight }}
              resizeMode="contain"
            />
          )}
        </View>

        {!hasRegions && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No food detected</Text>
            <Text style={styles.emptyStateBody}>
              The photo didn't contain any recognisable food regions. Try a clearer photo with the food in frame.
            </Text>
          </View>
        )}

        {hasRegions && (
          <View style={styles.regionList}>
            {segmentation_results.map((region, i) => renderRegionCard(region, i))}
          </View>
        )}

        <View style={styles.startOverRow}>
          <Button
            title="Try a different photo"
            onPress={resetToEntry}
            variant="ghost"
          />
        </View>
      </ScrollView>
    )
  }

  function renderErrorView(message: string): React.ReactNode {
    return (
      <View style={styles.errorContainer}>
        <ErrorMessage message={message} />
        <Button title="Try again" onPress={resetToEntry} variant="primary" />
      </View>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.flex}
      >
        <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
          {screen.phase === 'entry' && renderEntryView()}
          {screen.phase === 'loading' && renderLoadingView(screen.imageUri)}
          {screen.phase === 'result' && renderResultView(screen.imageUri, screen.response)}
          {screen.phase === 'error' && renderErrorView(screen.message)}
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },

  // Entry
  entryContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  screenTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.xl,
  },
  actionLabel: {
    ...typography.fieldLabel,
    color: colors.textLabel,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  // Permission denied banner
  permissionBanner: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  permissionText: {
    ...typography.error,
    color: colors.errorText,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  settingsLink: {
    alignSelf: 'flex-start',
  },
  settingsLinkText: {
    ...typography.link,
    color: colors.gradientEnd,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingImage: {
    borderRadius: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 20, 38, 0.45)',
    borderRadius: 12,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },

  // Image wrapper
  imageWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },

  // Result
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    paddingTop: spacing.md,
  },
  regionList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  regionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
  },
  regionCardTitle: {
    ...typography.fieldLabel,
    color: colors.textLabel,
    marginBottom: spacing.sm,
  },
  candidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  candidateRowTop: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  candidateName: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  candidateNameTop: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  candidateProb: {
    ...typography.body,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  candidateProbTop: {
    color: colors.gradientEnd,
    fontWeight: '600',
  },
  confirmPlaceholder: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
    opacity: 0.5,
  },
  confirmPlaceholderText: {
    ...typography.link,
    color: colors.gradientEnd,
  },

  // Empty segmentation state
  emptyState: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontSize: 18,
  },
  emptyStateBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  // Start over
  startOverRow: {
    marginTop: spacing.xl,
  },
})
