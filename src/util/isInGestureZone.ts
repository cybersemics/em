import viewportStore from '../stores/viewport'

const TOOLBAR_HEIGHT = 50

/** Returns true if the pointer is in the gesture zone. To the right for righties, to the left for lefties. */
const isInGestureZone = (x: number, y: number, leftHanded: boolean) => {
  const viewport = viewportStore.getState()
  const scrollZoneWidth = viewport.scrollZoneWidth

  return (leftHanded ? x > scrollZoneWidth : x < viewport.innerWidth - scrollZoneWidth) && y > TOOLBAR_HEIGHT
}

export default isInGestureZone
