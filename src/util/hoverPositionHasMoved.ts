import { TOUCH_SLOP } from '../constants'
import globals from '../globals'

/** Compare the new hover position against the global lastHoverDownPosition to determine if the pointer has moved. */
const hoverPositionHasMoved = (newHoverPosition: { x: number; y: number } | null) =>
  !newHoverPosition ||
  !globals.lastHoverDownPosition ||
  Math.abs(newHoverPosition.x - globals.lastHoverDownPosition.x) >= TOUCH_SLOP ||
  Math.abs(newHoverPosition.y - globals.lastHoverDownPosition.y) >= TOUCH_SLOP

export default hoverPositionHasMoved
