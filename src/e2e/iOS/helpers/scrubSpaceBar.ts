/** Milliseconds to hold the space bar before iOS switches it into caret-scrub mode. */
const SCRUB_HOLD_MS = 1200

/** Pixels moved per drag increment. */
const SCRUB_STEP_PX = 50

/**
 * Drives the iOS virtual keyboard's trackpad: long-presses the space bar to enter caret-scrub mode, then
 * drags horizontally. Switches to the native context to reach the keyboard and restores the web context.
 *
 * The pointer is anchored to the space key element rather than to its coordinates. `getElementRect` reports web
 * coordinates while `performActions` works in screen space, and mixing the two lands the touch on the letter
 * rows, which types instead of scrubbing.
 *
 * @param steps Number of drag increments. Negative drags left.
 */
const scrubSpaceBar = async (steps: number): Promise<void> => {
  const webContext = (await browser.getContext()) as string
  await browser.switchContext('NATIVE_APP')

  try {
    const space = await browser.$('-ios predicate string:type == "XCUIElementTypeKey" AND name == "space"')
    const elementId = (await space.getElement()).elementId
    const dx = steps < 0 ? -SCRUB_STEP_PX : SCRUB_STEP_PX

    // performActions directly: XCUITest does not implement the releaseActions endpoint that
    // action().perform() calls afterwards.
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          {
            type: 'pointerMove',
            duration: 0,
            origin: { 'element-6066-11e4-a52e-4f735466cecf': elementId },
            x: 0,
            y: 0,
          },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: SCRUB_HOLD_MS },
          ...Array.from({ length: Math.abs(steps) }, () => [
            { type: 'pointerMove' as const, duration: 300, origin: 'pointer' as const, x: dx, y: 0 },
            { type: 'pause' as const, duration: 100 },
          ]).flat(),
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
  } finally {
    await browser.switchContext(webContext)
  }
}

export default scrubSpaceBar
