/**
 * COORDINATE SPACE SCALING
 *
 * LogMeal returns bounding boxes in processed_image_size coordinate space.
 * The image displayed on screen occupies displayWidth x displayHeight pixels.
 * These two coordinate spaces are different and require explicit scaling.
 *
 * Scale factors:
 *   scaleX = displayWidth  / processedImageSize.width
 *   scaleY = displayHeight / processedImageSize.height
 *
 * Applied to each bbox [x, y, w, h]:
 *   screenX = x * scaleX
 *   screenY = y * scaleY
 *   screenW = w * scaleX
 *   screenH = h * scaleY
 *
 * Source: https://docs.logmeal.com/reference/post_v2-image-segmentation-complete
 * "Note: Bounding-box coordinates are in processed_image_size space,
 *  not the original/parsed image size."
 */

import React from 'react'
import { View, Image, StyleSheet } from 'react-native'
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg'
import { colors } from '../theme/colors'

const strokeColor = colors.gradientEnd
const labelBg = 'rgba(6, 182, 212, 0.85)'   // semi-transparent gradientEnd — SVG fill needs string literal
const labelText = colors.bgGradientStart     // dark bg color — ensures readable contrast on cyan label

interface Region {
  contained_bbox: { x: number; y: number; w: number; h: number }
  recognition_results: Array<{
    name: string
    prob: number
  }>
}

interface ProcessedImageSize {
  width: number
  height: number
}

interface BboxOverlayProps {
  imageUri: string
  displayWidth: number
  displayHeight: number
  processedImageSize: ProcessedImageSize
  regions: Region[]
}

export default function BboxOverlay({
  imageUri,
  displayWidth,
  displayHeight,
  processedImageSize,
  regions,
}: BboxOverlayProps) {
  const hasRegions = regions != null && regions.length > 0

  return (
    <View style={[styles.container, { width: displayWidth, height: displayHeight }]}>
      <Image
        source={{ uri: imageUri }}
        style={[StyleSheet.absoluteFill, { width: displayWidth, height: displayHeight }]}
        resizeMode="contain"
      />

      {hasRegions && (
        <Svg
          width={displayWidth}
          height={displayHeight}
          viewBox={`0 0 ${displayWidth} ${displayHeight}`}
          style={StyleSheet.absoluteFill}
        >
          {regions.map((region, index) => {
            const bbox = region.contained_bbox
            if (!bbox || typeof bbox !== 'object') return null

            const scaleX = displayWidth / processedImageSize.width
            const scaleY = displayHeight / processedImageSize.height

            const { x: bx, y: by, w: bw, h: bh } = bbox

            const screenX = bx * scaleX
            const screenY = by * scaleY
            const screenW = bw * scaleX
            const screenH = bh * scaleY

            const topName = region.recognition_results?.[0]?.name ?? 'Unknown'
            const displayName =
              topName.length > 20 ? topName.substring(0, 20) + '…' : topName

            const labelWidth = Math.min(screenW, displayName.length * 7 + 16)

            let labelBgY: number
            let labelTextY: number
            if (screenY >= 26) {
              // Tier 1: label above the box
              labelBgY = screenY - 24
              labelTextY = screenY - 8
            } else if (screenH >= 36) {
              // Tier 2: label inside the box at the top
              labelBgY = screenY + 4
              labelTextY = screenY + 18
            } else {
              // Tier 3: label below the box (small box near top edge)
              labelBgY = screenY + screenH + 2
              labelTextY = screenY + screenH + 16
            }

            return (
              <G key={index}>
                <Rect
                  x={screenX}
                  y={screenY}
                  width={screenW}
                  height={screenH}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={2}
                  rx={4}
                />
                <Rect
                  x={screenX}
                  y={labelBgY}
                  width={labelWidth}
                  height={22}
                  fill={labelBg}
                  rx={4}
                />
                <SvgText
                  x={screenX + 6}
                  y={labelTextY}
                  fontSize={11}
                  fontWeight="600"
                  fill={labelText}
                >
                  {displayName}
                </SvgText>
              </G>
            )
          })}
        </Svg>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
})
