const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Convert hexadecimal color string to RGB color values. Supports both 3-digit and 6-digit hex colors. */
const hexToRgb = (hex: string): string => {
  const match = hex.match(HEX_REGEX)

  if (!match) {
    throw new Error('Invalid hex color format')
  }

  let hexValue = match[1]

  // Convert 3-digit hex to 6-digit
  if (hexValue.length === 3) {
    hexValue = hexValue
      .split('')
      .map(char => char + char)
      .join('')
  }

  const r = parseInt(hexValue.slice(0, 2), 16)
  const g = parseInt(hexValue.slice(2, 4), 16)
  const b = parseInt(hexValue.slice(4, 6), 16)

  return `rgb(${r}, ${g}, ${b})`
}

export default hexToRgb
