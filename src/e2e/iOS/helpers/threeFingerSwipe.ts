/** Horizontal distance of the swipe, in pixels. Long enough for iOS to recognize it as the system gesture. */
const SWIPE_DISTANCE = 200

/** Vertical spacing between the three fingers, in pixels. */
const FINGER_SPACING = 30

/**
 * Performs the iOS three-finger horizontal swipe — the system gesture for native undo (left) and redo (right).
 *
 * Unlike em's own gestures (see gesture.ts) this is recognized by iOS rather than by em, so it is driven as three
 * simultaneous W3C touch pointers rather than one.
 */
const threeFingerSwipe = async (direction: 'l' | 'r') => {
  const windowSize = (await browser.getWindowSize())!
  const dx = direction === 'r' ? SWIPE_DISTANCE : -SWIPE_DISTANCE
  const xStart = Math.round(windowSize.width / 2 - dx / 2)
  const yStart = Math.round(windowSize.height / 2)

  // performActions directly rather than action().perform(), which follows up with the DELETE /actions endpoint that
  // Safari/XCUITest does not support. Same reason as gesture.ts.
  await browser.performActions(
    Array.from({ length: 3 }, (_, i) => ({
      type: 'pointer' as const,
      id: `finger${i}`,
      parameters: { pointerType: 'touch' as const },
      actions: [
        { type: 'pointerMove', duration: 0, x: xStart, y: yStart + i * FINGER_SPACING, origin: 'viewport' },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 50 },
        { type: 'pointerMove', duration: 250, x: xStart + dx, y: yStart + i * FINGER_SPACING, origin: 'viewport' },
        { type: 'pause', duration: 50 },
        { type: 'pointerUp', button: 0 },
      ],
    })),
  )
}

export default threeFingerSwipe
