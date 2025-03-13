const RGB_REGEX = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/

/** Convert RGB color values to a hexadecimal color string. */
const rgbToHex = (rgb: string): string => {
  const match = rgb.match(RGB_REGEX)

  if (!match) {
    throw new Error('Invalid RGB color format')
  }

  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])

  /** Convert RGB to hex. */
  const toHex = (value: number) => Math.min(Math.max(value, 0), 255).toString(16).padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default rgbToHex
