import React, { useEffect, useMemo, useState } from 'react'
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

import { useNavigation } from '@react-navigation/native'

import BboxOverlay from '../components/BboxOverlay'
import Button from '../components/Button'
import ErrorMessage from '../components/ErrorMessage'
import Input from '../components/Input'
import { client } from '../api/client'
import { useAuthStore } from '../store/auth'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecognitionCandidate {
  id: number
  name: string
  prob: number
}

interface SegmentationRegion {
  id: number
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

// LogMeal /confirm/dish response — we only care that it succeeded.
interface ConfirmResponse {
  status?: string
  imageId?: number
}

// LogMeal /nutrition/recipe/nutritionalInfo — defensively typed.
// LogMeal preserves the typo "totalNutritients"; we keep a fallback to
// "totalNutrients" in case it is ever fixed upstream.
interface KcalQuantity {
  quantity: number
  unit: string
}
interface NutrientBag {
  totalNutritients?: { ENERC_KCAL?: KcalQuantity }
  totalNutrients?: { ENERC_KCAL?: KcalQuantity }
}
interface NutritionItem {
  food_name?: string
  name?: string
  serving_size?: number
  unit?: string
  nutritional_info?: NutrientBag
}
interface NutritionResponse {
  serving_size?: number
  nutritional_info?: NutrientBag
  nutritional_info_per_item?: NutritionItem[]
}

function extractKcal(bag: NutrientBag | undefined): number {
  const k =
    bag?.totalNutritients?.ENERC_KCAL?.quantity ??
    bag?.totalNutrients?.ENERC_KCAL?.quantity
  return typeof k === 'number' ? k : 0
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

  const navigation = useNavigation()

  // ─── #14 state ──────────────────────────────────────────────────────────────
  // Per-region selected dish id, keyed by region INDEX in segmentation_results.
  // We key by index — not region.id — because LogMeal does not always return a
  // unique id field on each region (it's reliably present on candidates, not
  // regions). Index is guaranteed unique within an image. The candidate's id
  // is used as the value because that's what /confirm/dish expects.
  const [selections, setSelections] = useState<Record<number, number>>({})
  // Per-region transient state for the confirm-all action. Also keyed by
  // index for the same reason.
  const [regionStatus, setRegionStatus] = useState<
    Record<number, 'idle' | 'pending' | 'done' | 'error'>
  >({})
  // True while the "Confirm selections" button is processing. Drives the
  // button's loading prop and disables candidate taps.
  const [confirmingAll, setConfirmingAll] = useState<boolean>(false)
  // Settled nutrition response for the meal. Null until /logmeal/nutrition
  // returns; presence of this object also means "we are now in step B".
  const [nutrition, setNutrition] = useState<NutritionResponse | null>(null)
  const [nutritionLoading, setNutritionLoading] = useState<boolean>(false)
  const [nutritionError, setNutritionError] = useState<string | null>(null)
  // Serving size, kept as a string per profile-screen convention. Parsed to a
  // number only at calculation and save time.
  const [servingInput, setServingInput] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const imageDisplayWidth = width - spacing.xxl * 2

  function getDisplayHeight(processedImageSize: ProcessedImageSize): number {
    return imageDisplayWidth * (processedImageSize.height / processedImageSize.width)
  }

  // ─── #14 derived + effects ────────────────────────────────────────────────

  // Pre-select the highest-probability candidate for every region the first
  // time a result is rendered. We only initialise regions we have not seen
  // before so a user's manual change to selections survives re-renders.
  useEffect(() => {
    if (screen.phase !== 'result') return
    setSelections((prev) => {
      const next: Record<number, number> = { ...prev }
      let changed = false
      screen.response.segmentation_results.forEach((region, idx) => {
        if (next[idx] === undefined && region.recognition_results.length > 0) {
          next[idx] = region.recognition_results[0].id
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [screen])

  const baseGrams: number = useMemo(() => {
    const v = nutrition?.serving_size
    return typeof v === 'number' && v > 0 ? v : 100
  }, [nutrition])

  const baseKcal: number = useMemo(() => extractKcal(nutrition?.nutritional_info), [nutrition])

  const userGrams: number = useMemo(() => {
    const n = parseFloat(servingInput)
    return Number.isFinite(n) ? n : NaN
  }, [servingInput])

  const adjustedKcal: number = useMemo(() => {
    if (!Number.isFinite(userGrams) || userGrams <= 0 || baseGrams <= 0) return 0
    return (baseKcal / baseGrams) * userGrams
  }, [baseKcal, baseGrams, userGrams])

  const servingInvalid: boolean =
    servingInput.trim() === '' || !Number.isFinite(userGrams) || userGrams <= 0

  // Reset all #14 transient state. Used both on "Cancel" and on a successful
  // save so the screen returns to a clean entry view.
  function resetPhotoLogState(): void {
    setSelections({})
    setRegionStatus({})
    setConfirmingAll(false)
    setNutrition(null)
    setNutritionLoading(false)
    setNutritionError(null)
    setServingInput('')
    setSaving(false)
    setSaveError(null)
  }

  // POST a single /logmeal/confirm for one region. Caller manages overall
  // pending state; this returns a boolean so confirmAll can decide whether
  // to fall through to the nutrition fetch or stop and surface per-region
  // errors.
  async function confirmRegion(
    imageId: number,
    region: SegmentationRegion,
    regionIndex: number,
    dishId: number,
  ): Promise<boolean> {
    // LogMeal /confirm/dish wants a regionId. Prefer the API-supplied
    // region.id when present, otherwise fall back to the array index +1
    // (LogMeal regionIds are 1-based when they do appear).
    const apiRegionId =
      typeof region.id === 'number' ? region.id : regionIndex + 1
    setRegionStatus((s) => ({ ...s, [regionIndex]: 'pending' }))
    try {
      await client.post<ConfirmResponse>('/logmeal/confirm', {
        imageId,
        regionId: apiRegionId,
        dish_id: dishId,
      })
      setRegionStatus((s) => ({ ...s, [regionIndex]: 'done' }))
      return true
    } catch (err) {
      console.error('[PhotoLog] confirm region failed:', regionIndex, err)
      setRegionStatus((s) => ({ ...s, [regionIndex]: 'error' }))
      return false
    }
  }

  // Fetch nutrition once for the whole image. Single call covering all
  // regions — not one call per region. Called only after every region has
  // been successfully confirmed.
  async function fetchNutrition(imageId: number): Promise<void> {
    setNutritionLoading(true)
    setNutritionError(null)
    try {
      const res = await client.post<NutritionResponse>('/logmeal/nutrition', { imageId })
      setNutrition(res.data)
      const initialGrams = typeof res.data.serving_size === 'number' && res.data.serving_size > 0
        ? res.data.serving_size
        : 100
      setServingInput(String(initialGrams))
    } catch (err) {
      console.error('[PhotoLog] nutrition fetch failed:', err)
      setNutritionError('Could not load nutrition information — please try again')
    } finally {
      setNutritionLoading(false)
    }
  }

  // Drives Step A → Step B. Confirms every region sequentially, allows
  // partial failure, and only advances to nutrition when every region is
  // confirmed successfully.
  async function handleConfirmAll(): Promise<void> {
    if (screen.phase !== 'result') return
    const { response } = screen
    setConfirmingAll(true)
    let allOk = true
    for (let idx = 0; idx < response.segmentation_results.length; idx++) {
      const region = response.segmentation_results[idx]
      const dishId = selections[idx]
      if (dishId === undefined) {
        allOk = false
        setRegionStatus((s) => ({ ...s, [idx]: 'error' }))
        continue
      }
      const ok = await confirmRegion(response.imageId, region, idx, dishId)
      if (!ok) allOk = false
    }
    setConfirmingAll(false)
    if (allOk) {
      await fetchNutrition(response.imageId)
    }
  }

  // Retry a single region after a failed confirm. Does not block other
  // regions. If after retry every region is 'done', auto-advance to
  // nutrition fetch.
  async function handleRetryRegion(
    region: SegmentationRegion,
    regionIndex: number,
  ): Promise<void> {
    if (screen.phase !== 'result') return
    const dishId = selections[regionIndex]
    if (dishId === undefined) return
    const ok = await confirmRegion(screen.response.imageId, region, regionIndex, dishId)
    if (!ok) return
    // Check whether all regions are now done.
    const allDone = screen.response.segmentation_results.every(
      (_r, i) => (i === regionIndex ? true : regionStatus[i] === 'done'),
    )
    if (allDone) {
      await fetchNutrition(screen.response.imageId)
    }
  }

  // Build the concatenated food_name from the user's confirmed selections.
  function buildFoodName(response: SegmentationResponse): string {
    const names = response.segmentation_results
      .map((region, idx) => {
        const id = selections[idx]
        const c = region.recognition_results.find((rc) => rc.id === id)
        return c?.name ?? null
      })
      .filter((n): n is string => n !== null && n.length > 0)
    return names.join(' + ')
  }

  async function handleSaveDiary(): Promise<void> {
    if (screen.phase !== 'result' || !nutrition || servingInvalid) return
    setSaving(true)
    setSaveError(null)
    try {
      await client.post('/diary', {
        entry_type: 'photo',
        food_name: buildFoodName(screen.response),
        kcal: Math.round(adjustedKcal * 10) / 10,
        amount: userGrams,
        unit: 'g',
        occasion: screen.response.occasion ?? null,
        image_url: null,
        logged_at: new Date().toISOString(),
      })
      resetPhotoLogState()
      setScreen({ phase: 'entry' })
      navigation.navigate('Diary' as never)
    } catch (err) {
      console.error('[PhotoLog] save diary failed:', err)
      setSaveError('Could not save to diary — please try again')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel(): void {
    resetPhotoLogState()
    setScreen({ phase: 'entry' })
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
    resetPhotoLogState()
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
    const selectedId = selections[index]
    const status = regionStatus[index] ?? 'idle'
    // After Step B has begun (nutrition is loaded or loading), candidate
    // selection is locked — the user cannot retroactively change a confirmed
    // selection without cancelling the flow.
    const locked = nutrition !== null || nutritionLoading || confirmingAll
    return (
      <View key={index} style={styles.regionCard}>
        <View style={styles.regionCardHeader}>
          <Text style={styles.regionCardTitle}>Region {index + 1}</Text>
          {status === 'pending' && (
            <ActivityIndicator size="small" color={colors.gradientEnd} />
          )}
          {status === 'done' && (
            <Text style={styles.regionStatusDone}>Confirmed</Text>
          )}
        </View>
        {top5.map((candidate) => {
          const isSelected = candidate.id === selectedId
          return (
            <TouchableOpacity
              key={candidate.id}
              activeOpacity={0.7}
              disabled={locked}
              onPress={() =>
                setSelections((s) => ({ ...s, [index]: candidate.id }))
              }
              style={[
                styles.candidateRow,
                isSelected ? styles.candidateRowSelected : styles.candidateRowUnselected,
              ]}
            >
              <Text
                style={[
                  styles.candidateName,
                  isSelected && styles.candidateNameSelected,
                ]}
                numberOfLines={1}
              >
                {candidate.name}
              </Text>
              <Text
                style={[
                  styles.candidateProb,
                  isSelected && styles.candidateProbSelected,
                ]}
              >
                {Math.round(candidate.prob * 100)}%
              </Text>
            </TouchableOpacity>
          )
        })}
        {status === 'error' && (
          <View style={styles.regionErrorRow}>
            <Text style={styles.regionErrorText}>
              Could not confirm this region.
            </Text>
            <TouchableOpacity
              onPress={() => handleRetryRegion(region, index)}
              disabled={confirmingAll}
            >
              <Text style={styles.regionRetryLink}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  function renderNutritionSection(): React.ReactNode {
    if (nutritionLoading) {
      return (
        <View style={styles.nutritionCard}>
          <ActivityIndicator size="small" color={colors.gradientEnd} />
          <Text style={styles.nutritionLoadingText}>Loading nutrition…</Text>
        </View>
      )
    }
    if (nutritionError) {
      return (
        <View style={styles.nutritionCard}>
          <ErrorMessage message={nutritionError} />
          <Button
            title="Retry"
            onPress={() => {
              if (screen.phase === 'result') fetchNutrition(screen.response.imageId)
            }}
            variant="ghost"
          />
        </View>
      )
    }
    if (!nutrition) return null

    const items = nutrition.nutritional_info_per_item ?? []
    const displayKcal = Math.round(adjustedKcal)

    return (
      <View style={styles.nutritionCard}>
        <Text style={styles.nutritionLabel}>Total energy</Text>
        <Text style={styles.nutritionKcal}>{displayKcal} kcal</Text>

        {items.length > 0 && (
          <View style={styles.itemsBlock}>
            <Text style={styles.itemsHeading}>Per-item breakdown</Text>
            {items.map((item, i) => {
              const name = item.food_name ?? item.name ?? `Item ${i + 1}`
              const qty = typeof item.serving_size === 'number' ? item.serving_size : null
              const unit = item.unit ?? 'g'
              const itemKcal = Math.round(extractKcal(item.nutritional_info))
              return (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.itemMeta}>
                    {qty !== null ? `${qty} ${unit}` : '—'} · {itemKcal} kcal
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        <View style={styles.servingBlock}>
          <Input
            label="Serving size (g)"
            value={servingInput}
            onChangeText={setServingInput}
            keyboardType="numeric"
            hasError={servingInvalid}
          />
          {servingInvalid && (
            <Text style={styles.servingHelp}>Enter a serving size greater than zero.</Text>
          )}
        </View>

        {saveError && (
          <View style={styles.saveErrorRow}>
            <ErrorMessage message={saveError} />
          </View>
        )}

        <View style={styles.saveRow}>
          <Button
            title="Save to diary"
            onPress={handleSaveDiary}
            loading={saving}
            disabled={servingInvalid || saving}
            variant="primary"
          />
        </View>
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

        {hasRegions && nutrition === null && !nutritionLoading && !nutritionError && (
          <View style={styles.confirmAllRow}>
            <Button
              title="Confirm selections"
              onPress={handleConfirmAll}
              loading={confirmingAll}
              disabled={confirmingAll}
              variant="primary"
            />
          </View>
        )}

        {(nutrition !== null || nutritionLoading || nutritionError) && (
          <View style={styles.nutritionWrapper}>{renderNutritionSection()}</View>
        )}

        <View style={styles.startOverRow}>
          <Button
            title={hasRegions ? 'Cancel' : 'Try a different photo'}
            onPress={handleCancel}
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
  regionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  regionStatusDone: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
  },
  candidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  candidateRowUnselected: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  candidateRowSelected: {
    borderColor: colors.borderFocused,
    backgroundColor: colors.surfaceStrong,
  },
  candidateName: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  candidateNameSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  candidateProb: {
    ...typography.body,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  candidateProbSelected: {
    color: colors.gradientEnd,
    fontWeight: '600',
  },
  regionErrorRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regionErrorText: {
    ...typography.error,
    color: colors.errorText,
    flex: 1,
    marginRight: spacing.sm,
  },
  regionRetryLink: {
    ...typography.link,
    color: colors.gradientEnd,
  },

  // Confirm-all + nutrition
  confirmAllRow: {
    marginTop: spacing.lg,
  },
  nutritionWrapper: {
    marginTop: spacing.lg,
  },
  nutritionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
  },
  nutritionLoadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  nutritionLabel: {
    ...typography.fieldLabel,
    color: colors.textLabel,
    marginBottom: spacing.xs,
  },
  nutritionKcal: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  itemsBlock: {
    marginBottom: spacing.lg,
  },
  itemsHeading: {
    ...typography.fieldLabel,
    color: colors.textLabel,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  itemMeta: {
    ...typography.body,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  servingBlock: {
    marginTop: spacing.sm,
  },
  servingHelp: {
    ...typography.error,
    color: colors.errorText,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  saveErrorRow: {
    marginBottom: spacing.sm,
  },
  saveRow: {
    marginTop: spacing.sm,
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
