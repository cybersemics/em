import { XYCoord } from 'react-dnd'

/** Store the position where the last invocation occurred in order to short-circuit until the pointer position changes (#3278). */
let lastMouseDownPosition: XYCoord | null = null

/** Compare the new hover position against the global lastMouseDownPosition to determine if the pointer has moved. */
const mousePositionHasMoved = (newMousePosition: { x: number; y: number } | null) =>
  !newMousePosition ||
  !lastMouseDownPosition ||
  newMousePosition.x !== lastMouseDownPosition.x ||
  newMousePosition.y !== lastMouseDownPosition.y

/** Throttle callback until the pointer position moves. */
const throttleByMousePosition = (callback: () => void, mousePosition: XYCoord | null) => {
  if (!mousePositionHasMoved(mousePosition)) return

  if (mousePosition !== undefined) lastMouseDownPosition = mousePosition

  callback()
}

export default throttleByMousePosition
