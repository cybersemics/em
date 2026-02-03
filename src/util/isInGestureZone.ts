import { TOOLBAR_HEIGHT } from '../constants'
import viewportStore from '../stores/viewport'

/** Returns true if the pointer is in the gesture zone. To the right for righties, to the left for lefties. */
const isInGestureZone = (x: number, y: number, leftHanded: boolean) => {
  const viewport = viewportStore.getState()
  const scrollZoneWidth = viewport.scrollZoneWidth
  const isInGestureZone =
    (leftHanded ? x > scrollZoneWidth : x < viewport.innerWidth - scrollZoneWidth) && y > TOOLBAR_HEIGHT
  return isInGestureZone
}

export default isInGestureZone
