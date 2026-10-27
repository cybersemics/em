/** Pixels moved per drag increment. A finger moving slowly from the edge reports moves of a pixel or two, which is what lets Safari's swipe-back claim the touch before a page's touchmove handler can cancel it. */
const SWIPE_STEP_PX = 2

/** Milliseconds per drag increment. */
const SWIPE_STEP_MS = 30

/**
 * Swipes right from the left edge of the screen the way a finger does, slowly at first, so that Mobile Safari's
 * native swipe-back gesture can recognize it.
 *
 * The touch is synthesized in the native context because Safari's edge gesture belongs to the browser chrome, not the
 * page: a touch dispatched in the web context never reaches it. The web context is restored afterwards, looked up
 * again because a navigation caused by the swipe replaces the webview the test was in.
 */
const swipeFromLeftEdge = async (): Promise<void> => {
  await browser.switchContext('NATIVE_APP')

  try {
    const { height, width } = await browser.getWindowSize()
    const y = Math.round(height / 2)

    // performActions directly: XCUITest does not implement the releaseActions endpoint that
    // action().perform() calls afterwards.
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          // Safari only recognizes a synthesized touch as an edge swipe when it starts at the very edge of the screen.
          { type: 'pointerMove', duration: 0, x: 1, y },
          { type: 'pointerDown', button: 0 },
          ...Array.from({ length: 30 }, (_, i) => ({
            type: 'pointerMove' as const,
            duration: SWIPE_STEP_MS,
            x: 1 + (i + 1) * SWIPE_STEP_PX,
            y,
          })),
          { type: 'pointerMove', duration: 200, x: Math.round(width * 0.8), y },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
  } finally {
    const contexts = (await browser.getContexts()) as (string | { id: string })[]
    const webContext = contexts
      .map(context => (typeof context === 'string' ? context : context.id))
      .find(id => id.startsWith('WEBVIEW'))
    if (!webContext)
      throw new Error(`No webview context to return to after the edge swipe: ${JSON.stringify(contexts)}`)
    await browser.switchContext(webContext)
  }
}

export default swipeFromLeftEdge
