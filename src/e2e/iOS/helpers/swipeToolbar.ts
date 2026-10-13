import getElementRectByScreen from './getElementRectByScreen.js'

/**
 * Swipe a finger horizontally across the toolbar's row of buttons to scroll it. A swipe to the left moves the content
 * left and reveals the buttons to the right, increasing the toolbar's scrollLeft.
 *
 * The swipe is aimed at the row of icons rather than the center of the toolbar, since an open picker is rendered
 * inside the toolbar and expands it down over the swatches. It spans the middle half of the toolbar, clear of the
 * scroll arrows that overlap its edges.
 * Uses the global browser object from WDIO.
 */
const swipeToolbar = async (direction: 'left' | 'right') => {
  const toolbarRect = await getElementRectByScreen(await browser.$('#toolbar').getElement())
  // An open picker's swatches are svgs too, so take the first icon explicitly rather than with WebdriverIO's strict `$`.
  const iconRect = await getElementRectByScreen(await browser.$$('[data-testid="toolbar-icon"] svg')[0].getElement())

  const y = Math.round(iconRect.y + iconRect.height / 2)
  const left = Math.round(toolbarRect.x + toolbarRect.width / 4)
  const right = Math.round(toolbarRect.x + (toolbarRect.width * 3) / 4)
  const [fromX, toX] = direction === 'left' ? [right, left] : [left, right]

  // Use performActions directly, since XCUITest does not implement the releaseActions endpoint that action().perform()
  // calls afterwards.
  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: fromX, y, origin: 'viewport' },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 100 },
        { type: 'pointerMove', duration: 400, x: toX, y, origin: 'viewport' },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
}

export default swipeToolbar
