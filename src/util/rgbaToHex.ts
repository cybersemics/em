const RGBA_REGEX = /^rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([01]?\.?\d*)\)$/

/** Convert RGBA color values to a hexadecimal color string. */
const rgbaToHex = (rgba: string): string => {
  const match = rgba.match(RGBA_REGEX)

  if (!match) {
    throw new Error('Invalid RGBA color format')
  }

  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])
  const a = parseFloat(match[4])

  /** Convert RGB to hex. */
  const toHex = (value: number) => Math.min(Math.max(value, 0), 255).toString(16).padStart(2, '0')

  const alphaHex =
    a >= 1
      ? Math.round(a * 255)
          .toString(16)
          .padStart(2, '0')
      : ''
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`
}

export default rgbaToHex
