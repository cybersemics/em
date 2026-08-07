import { ColorToken } from '../colors.config'
import themeColors from '../selectors/themeColors'
import rgbToHex from './rgbToHex'

/** Adds an alpha channel to a hex color if it does not already have one. */
const addAlphaToHex = (hex: string) => (hex.length === 7 ? hex + 'ff' : hex)

/** Extracts and cleans a hex color value from a potential HTML-like string, adding an alpha channel. Returns null if there is no color. */
const getCleanColor = (color: string | null) => {
  if (!color) return null
  // Extract clean color value from potential HTML-like string.
  const colorMatch = typeof color === 'string' ? color.match(/#[0-9a-fA-F]{6}/) : null
  const cleanColor = colorMatch ? colorMatch[0] : color
  return cleanColor && typeof cleanColor === 'string' ? addAlphaToHex(rgbToHex(cleanColor)) : null
}

/**
 * Returns true if the given swatch color or background color matches the current command (formatting) state.
 *
 * Both the swatch color and the command state color are normalized to hex with an alpha channel before comparison, because `foreColor` is stored as hex and `backColor` as rgb.
 */
const isColorSelected = (
  themeColor: ReturnType<typeof themeColors>,
  commandState: { foreColor?: boolean | string; backColor?: boolean | string },
  swatch: { color?: ColorToken; backgroundColor?: ColorToken },
): boolean => {
  const { color, backgroundColor } = swatch
  const commandStateColor = getCleanColor(typeof commandState.foreColor === 'string' ? commandState.foreColor : null)
  const commandStateBackgroundColor = getCleanColor(
    typeof commandState.backColor === 'string' ? commandState.backColor : null,
  )

  const textHexColor = color ? addAlphaToHex(rgbToHex(themeColor[color])) : undefined
  const backHexColor = backgroundColor ? addAlphaToHex(rgbToHex(themeColor[backgroundColor])) : undefined

  return !!(
    (textHexColor && textHexColor === commandStateColor) ||
    (backHexColor && backHexColor === commandStateBackgroundColor)
  )
}

export default isColorSelected
