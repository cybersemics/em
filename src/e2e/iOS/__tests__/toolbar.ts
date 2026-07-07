/**
 * IOS toolbar tests.
 * Uses WDIO test runner with Mocha framework.
 */
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'

/**
 * Performs a continuous diagonal touch swipe (both axes move simultaneously on every step).
 * The built-in gesture helper only moves one axis per path segment, so it cannot produce a true
 * ~45° diagonal, which is required to reproduce the toolbar drag bug.
 */
const diagonalSwipe = async ({
  xStart,
  yStart,
  dx,
  dy,
}: {
  xStart: number
  yStart: number
  dx: number
  dy: number
}) => {
  const steps = 12
  const actions = [
    { type: 'pointerMove', duration: 0, x: Math.round(xStart), y: Math.round(yStart), origin: 'viewport' },
    { type: 'pointerDown', button: 0 },
    { type: 'pause', duration: 100 },
    ...Array.from({ length: steps }, (_, i) => ({
      type: 'pointerMove',
      duration: 30,
      x: Math.round(xStart + (dx * (i + 1)) / steps),
      y: Math.round(yStart + (dy * (i + 1)) / steps),
      origin: 'viewport',
    })),
    { type: 'pointerUp', button: 0 },
  ]

  // Use performActions directly to avoid the automatic releaseActions call, which Safari/XCUITest
  // does not support (matches src/e2e/iOS/helpers/gesture.ts).
  await browser.performActions([{ type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' }, actions }])
}

describe('Toolbar', () => {
  // Regression test for https://github.com/cybersemics/em/issues/3770
  // A diagonal swipe beginning on the fixed toolbar must not pan the page (which visually drags the
  // toolbar downward on iOS). A pure-vertical swipe does not reproduce the bug: the horizontally-scrolling
  // #toolbar container consumes it. Only a diagonal gesture engages the container's horizontal scroll while
  // also panning the page vertically, which is what touch-action: pan-x prevents.
  it('is not draggable vertically by a diagonal swipe on the toolbar', async () => {
    // Create enough thoughts to make the page vertically scrollable.
    const thoughts = Array.from({ length: 40 }, (_, i) => `  - thought ${i + 1}`).join('\n')
    await paste(thoughts)
    await waitForEditable('thought 1')

    // Scroll the page down so a downward drag has room to scroll it further. Assert the page is actually
    // scrollable so the test cannot silently pass on a non-scrollable page.
    const scrollBefore = await browser.execute(() => {
      window.scrollTo(0, 300)
      return window.scrollY
    })
    expect(scrollBefore).toBeGreaterThan(0)

    // Diagonal (down + right) swipe starting at the center of the toolbar. The rightward component engages
    // the toolbar's horizontal scroll; the downward component is what would pan the page on iOS without pan-x.
    const toolbar = await browser.$('[data-testid="toolbar"]').getElement()
    const rect = await browser.getElementRect(toolbar.elementId)
    await diagonalSwipe({ xStart: rect.x + rect.width / 2, yStart: rect.y + rect.height / 2, dx: 100, dy: 120 })

    // The diagonal drag on the toolbar must not scroll (drag) the page.
    const scrollAfter = await browser.execute(() => window.scrollY)
    expect(scrollAfter).toBe(scrollBefore)
  })
})
