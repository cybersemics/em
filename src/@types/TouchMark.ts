/** A point Show Touches draws: a dot where the primary touch started or moved, a ring where it lifted or was cancelled, or a double ring where it lifted to complete a double tap. Coordinates are the touch's clientX and clientY. */
interface TouchMark {
  kind: 'dot' | 'ring' | 'doubleRing'
  x: number
  y: number
}

export default TouchMark
