import _ from 'lodash'
import Player, { LottieRefCurrentProps } from 'lottie-react'
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import AnimatedColor from '../../@types/lottie/AnimatedColor'
import ColorProperty from '../../@types/lottie/ColorProperty'
import LottieData from '../../@types/lottie/LottieData'
import RGBA from '../../@types/lottie/RGBA'
import ShapeItem from '../../@types/lottie/ShapeItem'
import ShapeLayer from '../../@types/lottie/ShapeLayer'
import StaticColor from '../../@types/lottie/StaticColor'
import hexToRgb from '../../util/hexToRgb'

/** The props for the LottieAnimation component. */
interface LottieAnimationProps {
  animationData: LottieData | null
  speed?: number
  color: string
  onComplete?: () => void
}

/**
 * Converts hex color to RGBA.
 *
 * @param hex - The hex color code.
 * @returns The RGBA values as [r, g, b, a].
 */
const hexToRGBA = (hex: string): RGBA => {
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

/** Checks if the ColorProperty is a StaticColor. */
function isStaticColor(color: ColorProperty): color is StaticColor {
  return color.a === 0
}

/** Checks if the ColorProperty is an AnimatedColor. */
function isAnimatedColor(color: ColorProperty): color is AnimatedColor {
  return color.a === 1
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
 * @returns The updated ShapeItem with colors changed.
 */
const updateColorsInItem = (item: ShapeItem, rgbaArray: RGBA): ShapeItem => {
  if ((item.ty === 'st' || item.ty === 'fl') && item.c) {
    if (isAnimatedColor(item.c)) {
      item.c.k = item.c.k.map(keyframe => {
        keyframe.s = rgbaArray
        return keyframe
      })
    }
    if (isStaticColor(item.c)) {
      item.c.k = rgbaArray
    }
  }
  if (item.it) {
    item.it = item.it.map((subItem: ShapeItem) => updateColorsInItem(subItem, rgbaArray))
  }
  return item
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

  clonedData.layers = clonedData.layers.map((layer: ShapeLayer) => {
    if (layer.shapes) {
      layer.shapes = layer.shapes.map((shape: ShapeItem) => {
        if (shape.it) {
          shape.it = shape.it.map((item: ShapeItem) => updateColorsInItem(item, rgbaArray))
        }
        return shape
      })
    }
    return layer
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
 * This does not affect the Lottie animation's JSON content or alter its visual elements.
 */
const LottieAnimation: React.FC<LottieAnimationProps> = ({ animationData, speed = 1, color, onComplete }) => {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null)

  const animationDataWithColor = useMemo(() => {
    return animationData ? changeLineColor(animationData, color) : null
  }, [animationData, color])

  // skip the animation in Puppeteer tests to avoid inconsistent snapshots
  if (navigator.webdriver) {
    useLayoutEffect(() => {
      if (!lottieRef.current) return

      const lastFrame = lottieRef.current.getDuration(true)! - 1
      lottieRef.current.goToAndStop(lastFrame)
      onComplete?.()
    }, [onComplete])
  }

  useEffect(() => {
    if (lottieRef.current && animationDataWithColor) {
      lottieRef.current.setSpeed(speed)
    }
  }, [speed, animationDataWithColor])

  if (!animationDataWithColor) {
    return null
  }

  return (
    <Player
      style={{
        width: '100%',
        height: '100%',
      }}
      animationData={animationDataWithColor}
      lottieRef={lottieRef}
      // turn off autoplay in puppeteer tests
      autoplay={!navigator.webdriver}
      loop={false}
      onComplete={onComplete}
    />
  )
}

export default LottieAnimation
