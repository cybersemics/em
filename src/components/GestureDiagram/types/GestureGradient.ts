/** Colors and path-length extent of a gesture gradient. */
interface GestureGradient {
  /** Color at the beginning of the ramp. */
  from: string
  /** Color at the end of the ramp. */
  to: string
  /** Percentage held at the start color before blending begins. Default 0. */
  startOffset?: number
  /** Percentage at which the gradient reaches the end color. Default 100. */
  endOffset?: number
}

export default GestureGradient
