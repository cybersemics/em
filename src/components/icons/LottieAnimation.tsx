import { hexToRgb } from '@mui/material'
import _ from 'lodash'
import Player, { LottieRefCurrentProps } from 'lottie-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import AnimationKeyframe from '../../@types/lottie/AnimationKeyframe'
import LottieData from '../../@types/lottie/LottieData'
import RGBA from '../../@types/lottie/RGBA'
import ShapeItem from '../../@types/lottie/ShapeItem'
import ShapeLayer from '../../@types/lottie/ShapeLayer'

/** The props for the LottieAnimation component. */
interface LottieAnimationProps {
  animationData: LottieData | null
  speed?: number
  color?: string
  onComplete?: () => void
  style?: React.CSSProperties
}

/**
 * Converts hex color to RGBA using Material UI's hexToRgb.
 *
 * @param hex - The hex color code.
 * @returns The RGBA values as [r, g, b, a].
 */
const hexToRGBA = (hex: string): [number, number, number, number] => {
  const rgbString = hexToRgb(hex)

  if (rgbString) {
    // Regular expression to match rgb or rgba strings
    const regex = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([01]?\.?\d*))?\)$/
    const matches = rgbString.match(regex)

    if (matches) {
      const r = Number(matches[1])
      const g = Number(matches[2])
      const b = Number(matches[3])
      const a = matches[4] !== undefined ? Number(matches[4]) : 1 // Default alpha to 1 if not present
      return [r / 255, g / 255, b / 255, a]
    } else {
      console.warn('Invalid RGB string format. Falling back to black.')
    }
  } else {
    console.warn('hexToRgb returned null. Falling back to black.')
  }

  // Fallback to black with full opacity if hex is invalid
  return [0, 0, 0, 1]
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
        const keyframes = item.c.k as AnimationKeyframe[]
        keyframes.forEach(keyframe => {
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
      style={{
        ...style,
        width: '100%',
        height: '100%',
      }}
      animationData={animationDataWithColor}
      lottieRef={lottieRef}
      autoplay
      loop={false}
      onComplete={onComplete}
    />
  )
}

export default LottieAnimation
