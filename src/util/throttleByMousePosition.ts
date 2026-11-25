import { XYCoord } from 'react-dnd'
import ministore from '../stores/ministore'

/** The position where the last invocation occurred, in order to short-circuit until the pointer position changes (#3278). A ministore rather than a module variable so that resetStores clears it between tests. Held as a field because a null position would otherwise be the whole state. Read imperatively; nothing subscribes. */
const lastMouseDownPositionStore = ministore<{ position: XYCoord | null }>({ position: null })

/** Compare the new hover position against the global lastMouseDownPosition to determine if the pointer has moved. */
const mousePositionHasMoved = (newMousePosition: { x: number; y: number } | null) => {
  const lastMouseDownPosition = lastMouseDownPositionStore.getState().position
  return (
    !newMousePosition ||
    !lastMouseDownPosition ||
    newMousePosition.x !== lastMouseDownPosition.x ||
    newMousePosition.y !== lastMouseDownPosition.y
  )
}

/** Throttle callback until the pointer position moves. The position is compared relative to the document rather than the viewport, so that a pointer held still while the page scrolls under it, such as during scroll-at-edge, counts as moving onto whatever scrolls beneath it (#6281). */
const throttleByMousePosition = (callback: () => void, clientPosition: XYCoord | null) => {
  const mousePosition = clientPosition && { x: clientPosition.x + window.scrollX, y: clientPosition.y + window.scrollY }
  if (!mousePositionHasMoved(mousePosition)) return

  if (mousePosition !== undefined) lastMouseDownPositionStore.update({ position: mousePosition })

  callback()
}

export default throttleByMousePosition
