/** Applies CSS hue-rotate(deg) and saturate(amount) filter math directly to a hex or rgb(a) color,
 * without invoking a runtime CSS filter. This can be useful as a performance optimization. */
const tintColor = (color: string, hueDegrees: number, saturate: number): string => {
  const rad = (hueDegrees * Math.PI) / 180
  const c = Math.cos(rad)
  const n = Math.sin(rad)
  const t = saturate
  const hue = [
    [0.213 + c * 0.787 - n * 0.213, 0.715 - c * 0.715 - n * 0.715, 0.072 - c * 0.072 + n * 0.928],
    [0.213 - c * 0.213 + n * 0.143, 0.715 + c * 0.285 + n * 0.14, 0.072 - c * 0.072 - n * 0.283],
    [0.213 - c * 0.213 - n * 0.787, 0.715 - c * 0.715 + n * 0.715, 0.072 + c * 0.928 + n * 0.072],
  ]
  const sat = [
    [0.213 + 0.787 * t, 0.715 - 0.715 * t, 0.072 - 0.072 * t],
    [0.213 - 0.213 * t, 0.715 + 0.285 * t, 0.072 - 0.072 * t],
    [0.213 - 0.213 * t, 0.715 - 0.715 * t, 0.072 + 0.928 * t],
  ]
  // Composed matrix: saturate ∘ hue-rotate (CSS applies filters left to right).
  const m = [0, 1, 2].map(i =>
    [0, 1, 2].map(j => sat[i][0] * hue[0][j] + sat[i][1] * hue[1][j] + sat[i][2] * hue[2][j]),
  )
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim())
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(color.trim())
  let r = 0
  let g = 0
  let b = 0
  let a = 1
  if (hex) {
    r = parseInt(hex[1].slice(0, 2), 16)
    g = parseInt(hex[1].slice(2, 4), 16)
    b = parseInt(hex[1].slice(4, 6), 16)
  } else if (rgba) {
    const parts = rgba[1].split(',').map(v => parseFloat(v))
    ;[r, g, b] = parts
    a = parts.length > 3 ? parts[3] : 1
  } else {
    return color // unknown format: leave untinted rather than crash
  }
  /** Clamps a color channel to the 0-255 byte range. */
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `rgba(${clamp(m[0][0] * r + m[0][1] * g + m[0][2] * b)}, ${clamp(m[1][0] * r + m[1][1] * g + m[1][2] * b)}, ${clamp(m[2][0] * r + m[2][1] * g + m[2][2] * b)}, ${a})`
}

export default tintColor
