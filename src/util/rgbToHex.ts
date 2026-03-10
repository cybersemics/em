const RGB_RGBA_REGEX = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[01]?\.?\d*)?\)$/i
const HEX_REGEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/

/** Convert RGB/RGBA color values to a hexadecimal color string. If the input is already a hex color, returns it as-is. Alpha channel is truncated. */
const rgbToHex = (color: string): string => {
  // If already a hex color, return hex without alpha channel
  if (HEX_REGEX.test(color)) {
    return color.slice(0, 7)
  }

  const match = color.match(RGB_RGBA_REGEX)

  if (!match) {
    throw new Error('Invalid RGB/RGBA or hex color format')
  }

  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])

  /** Convert RGB to hex. */
  const toHex = (value: number) => Math.min(Math.max(value, 0), 255).toString(16).padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default rgbToHex
