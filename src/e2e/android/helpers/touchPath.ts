/** Milliseconds the finger rests after landing, before it moves or lifts. */
const PRESS_MS = 300

/** Milliseconds each move along the path takes. UiAutomator2 interpolates the touch events in between. */
const MOVE_MS = 500

/** Milliseconds the finger rests at each point of the path. */
const REST_MS = 300

/**
 * Puts a finger down on the screen at the first point, moves it through the rest, and lifts it, with the points in
 * screen pixels (getPageToScreen). A single point is a tap.
 *
 * The touch is performed in the native context, so it is real input to Android rather than an event dispatched to
 * the page. That is what reaches Chrome's own UI drawn over the page, such as the caret handle, which a touch from
 * chromedriver never touches.
 */
const touchPath = async (points: { x: number; y: number }[]): Promise<void> => {
  const [start, ...rest] = points
  if (!start) throw new Error('touchPath needs at least one point')

  const webContext = (await browser.getContext()) as string
  await browser.switchContext('NATIVE_APP')
  try {
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, origin: 'viewport', x: start.x, y: start.y },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: rest.length ? PRESS_MS : 100 },
          ...rest.flatMap(({ x, y }) => [
            { type: 'pointerMove', duration: MOVE_MS, origin: 'viewport', x, y },
            { type: 'pause', duration: REST_MS },
          ]),
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await browser.releaseActions()
  } finally {
    await browser.switchContext(webContext)
  }
}

export default touchPath
