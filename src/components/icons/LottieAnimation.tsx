import _ from 'lodash'
import Player, { LottieRefCurrentProps } from 'lottie-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import LottieData, { RGBA, ShapeItem, ShapeLayer } from '../../@types/LottieTypes'

/** The props for the LottieAnimation component. */
interface LottieAnimationProps {
  animationData: LottieData | null
  speed?: number
  color?: string
  onComplete?: () => void
  style?: React.CSSProperties
}

/**
 * Converts hex color to RGBA.
 *
 * @param hex - The hex color code.
 * @returns The RGBA values.
 */
const hexToRGBA = (hex: string): RGBA => {
  let r = 0,
    g = 0,
    b = 0
  const a = 1
  if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255
    g = parseInt(hex.slice(3, 5), 16) / 255
    b = parseInt(hex.slice(5, 7), 16) / 255
  }
  return [r, g, b, a]
}

/**
 * Updates colors in a single shape item.
 *
 * This function checks if the item represents a stroke or
 * fill and updates its color using the provided RGBA array.
 * If the item contains a nested items array, it recursively
 * calls itself to ensure that all relevant shapes within the
 * structure are updated with the new color.
 *
 * @param item - The shape item object which may contain
 * stroke or fill color properties.
 * @param rgbaArray - The RGBA values to set as new color.
 */
const updateColorsInItem = (item: ShapeItem, rgbaArray: RGBA) => {
  if ((item.ty === 'st' || item.ty === 'fl') && item.c) {
    // Check for animated color property
    if (item.c.a === 1) {
      if (Array.isArray(item.c.k)) {
        item.c.k.forEach((keyframe: any) => {
          keyframe.s = rgbaArray
        })
      }
    } else {
      item.c.k = rgbaArray
    }
  }
  if (item.it) {
    item.it.forEach((subItem: ShapeItem) => updateColorsInItem(subItem, rgbaArray))
  }
}

/**
 * Changes the color of stroke and fill attributes in the Lottie animation data.
 *
 * This function traverses the Lottie animation data structure to locate all items that
 * represent shape colors (strokes and fills) and applies a new color based on the provided
 * RGBA values derived from the 'newColor' hexadecimal string.
 *
 * @param data - The Lottie animation data object containing multiple layers and shapes.
 * @param newColor - A string representing the new color to be applied, in hexadecimal format.
 * @returns A new LottieData object with updated colors.
 */
const changeLineColor = (data: LottieData, newColor: string): LottieData => {
  const rgbaArray = hexToRGBA(newColor)
  const clonedData = _.cloneDeep(data) // Deep clone to create a new instance

  clonedData.layers.forEach((layer: ShapeLayer) => {
    if (layer.shapes) {
      layer.shapes.forEach((shape: ShapeItem) => {
        if (shape.it) {
          shape.it.forEach((item: ShapeItem) => updateColorsInItem(item, rgbaArray))
        }
      })
    }
  })

  return clonedData
}

/**
 * LottieAnimation Component.
 *
 * This component utilizes the 'lottie-react' Player to render a Lottie animation.
 * It accepts animation data and supports customizable speed and color properties,
 * allowing for dynamic control over the animation's playback rate and the stroke
 * and fill colors of its elements.
 *
 * Props:
 * animationData: The JSON data that defines the Lottie animation.
 * Speed: Optional. A number that specifies the playback speed of the animation. Defaults to 1 for normal speed.
 * Color: Optional. A string representing the hex color code used to update the stroke and fill colors of the animation. Defaults to '#FFFFFF' (white) if not specified.
 * OnComplete: Optional. A callback function that is triggered when the animation completes its playback.
 * Style: Optional. A React.CSSProperties object to apply inline styles to the player container.
 * This does not affect the Lottie animation's JSON content or alter its visual elements.
 */
const LottieAnimation: React.FC<LottieAnimationProps> = ({
  animationData,
  speed = 1,
  color = '#FFFFFF',
  onComplete,
  style,
}) => {
  const [key, setKey] = useState(0)
  const lottieRef = useRef<LottieRefCurrentProps | null>(null)

  const animationDataWithColor = useMemo(() => {
    return animationData ? changeLineColor(animationData, color) : null
  }, [animationData, color])

  useEffect(() => {
    if (lottieRef.current && animationDataWithColor) {
      lottieRef.current.setSpeed(speed)
      setKey(prevKey => prevKey + 1) // Forces the re-render to apply the color change
    }
  }, [speed, animationDataWithColor])

  if (!animationDataWithColor) {
    console.warn('animationData is not provided.')
    return null // Early return if animationData is null
  }

  return (
    <Player
      key={key} // Force re-render to apply theme changes, refreshing cached animation data with updated color settings
      style={style}
      animationData={animationDataWithColor}
      lottieRef={lottieRef}
      autoplay
      loop={false}
      onComplete={onComplete}
    />
  )
}

export default LottieAnimation
