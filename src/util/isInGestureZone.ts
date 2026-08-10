import { TOOLBAR_HEIGHT } from '../constants'
import getSafeAreaBottom from '../device/virtual-keyboard/getSafeAreaBottom'
import viewportStore from '../stores/viewport'

/** Returns true if the pointer is in the gesture zone. To the right for righties, to the left for lefties. Coordinates are viewport (client) coordinates. Excludes the toolbar at the top and, on devices with a home indicator (nonzero safe-area-inset-bottom), a strip at the bottom of the screen where the OS recognizes system gestures — otherwise the upward app switcher swipe is committed as the Open Command Center gesture right before the app suspends. The strip is twice the safe area inset to allow for the touchstart registering slightly above the bezel. */
const isInGestureZone = (x: number, y: number, leftHanded: boolean) => {
  const viewport = viewportStore.getState()
  const scrollZoneWidth = viewport.scrollZoneWidth
  const bottomSystemGestureZoneHeight = getSafeAreaBottom() * 2
  const isInGestureZone =
    (leftHanded ? x > scrollZoneWidth : x < viewport.innerWidth - scrollZoneWidth) &&
    y > TOOLBAR_HEIGHT &&
    y < viewport.innerHeight - bottomSystemGestureZoneHeight
  return isInGestureZone
}

export default isInGestureZone
