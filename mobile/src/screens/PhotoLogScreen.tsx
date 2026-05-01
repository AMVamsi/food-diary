import React from 'react'
import { View, Text, useWindowDimensions, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BboxOverlay from '../components/BboxOverlay'

const testImageUri = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'
const testProcessedImageSize = { width: 640, height: 480 }
const testRegions = [
  {
    // Region 1: large box near top — exercises tier 2 (label inside box)
    contained_bbox: [45, 10, 550, 420] as [number, number, number, number],
    recognition_results: [
      { name: 'Margherita pizza', prob: 0.91 },
      { name: 'Pizza', prob: 0.85 },
    ],
  },
  {
    // Region 2: small box in lower left — exercises tier 1 (label above)
    contained_bbox: [60, 340, 160, 80] as [number, number, number, number],
    recognition_results: [
      { name: 'Basil leaves', prob: 0.78 },
      { name: 'Herb garnish', prob: 0.55 },
    ],
  },
  {
    // Region 3: tiny box near top-left — exercises tier 3 (label below)
    contained_bbox: [10, 5, 60, 28] as [number, number, number, number],
    recognition_results: [
      { name: 'Garnish', prob: 0.65 },
    ],
  },
]
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'

export default function PhotoLogScreen() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  // Display the image at full width with a fixed sensible height
  // The BboxOverlay will scale bbox coordinates from processedImageSize
  // to these display dimensions regardless of the actual image aspect ratio
  const displayWidth = width - spacing.xxl * 2
  const displayHeight = displayWidth  // square display — works for most food photos

  return (
    <LinearGradient
      colors={[colors.bgGradientStart, colors.bgGradientMid, colors.bgGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Bbox Spike — issue #11</Text>
        <Text style={styles.subtitle}>
          Verify boxes align with food regions
        </Text>

        <View style={styles.imageWrapper}>
          <BboxOverlay
            imageUri={testImageUri}
            displayWidth={displayWidth}
            displayHeight={displayHeight}
            processedImageSize={testProcessedImageSize}
            regions={testRegions}
          />
        </View>

        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Scale factors</Text>
          <Text style={styles.debugText}>
            scaleX: {(displayWidth / testProcessedImageSize.width).toFixed(4)}
          </Text>
          <Text style={styles.debugText}>
            scaleY: {(displayHeight / testProcessedImageSize.height).toFixed(4)}
          </Text>
          <Text style={styles.debugText}>
            Aspect ratio: {(displayHeight / displayWidth).toFixed(2)}
          </Text>
          <Text style={styles.debugText}>
            Display: {displayWidth.toFixed(0)} × {displayHeight.toFixed(0)}
          </Text>
          <Text style={styles.debugText}>
            Processed: {testProcessedImageSize.width} × {testProcessedImageSize.height}
          </Text>
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.xxl },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugCard: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
})
