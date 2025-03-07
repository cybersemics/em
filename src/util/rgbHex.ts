/**
 * Converts RGBA color values to a hexadecimal color string.
 * @returns Hexadecimal color string in the format #RRGGBBAA.
 */
export const rgbaToHex = (rgba: string): string => {
  // Extract the RGBA components from the string using a regular expression
  const rgbaRegex = /^rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([01]?\.?\d*)\)$/
  const match = rgba.match(rgbaRegex)

  if (!match) {
    throw new Error('Invalid RGBA color format')
  }

  // Parse the extracted components
  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])
  const a = parseFloat(match[4])

  /** Convert RGB to hex. */
  const toHex = (value: number) => Math.min(Math.max(value, 0), 255).toString(16).padStart(2, '0')

  if (a >= 1) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}` // RGB hex only
  } else {
    const alphaHex = Math.round(a * 255)
      .toString(16)
      .padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}` // RGBA hex
  }
}

/**
 * Converts RGB color values to a hexadecimal color string.
 * @returns Hexadecimal color string in the format #RRGGBB.
 */
export const rgbToHex = (rgb: string): string => {
  // Extract the RGB components from the string using a regular expression
  const rgbRegex = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/
  const match = rgb.match(rgbRegex)

  if (!match) {
    throw new Error('Invalid RGB color format')
  }

  // Parse the extracted components
  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])

  /** Convert each component to a hex string with 2 digits (padded with zeros if necessary). */
  const toHex = (value: number) => Math.min(Math.max(value, 0), 255).toString(16).padStart(2, '0')

  // Concatenate all components to a single hex string
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Default export combining both functions
export default {
  rgbaToHex,
  rgbToHex,
}
