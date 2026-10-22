/** A point Show Touches draws: a dot where the primary touch started or moved, or a ring where it lifted or was cancelled. Coordinates are the touch's clientX and clientY. */
interface TouchMark {
  kind: 'dot' | 'ring'
  x: number
  y: number
}

export default TouchMark
