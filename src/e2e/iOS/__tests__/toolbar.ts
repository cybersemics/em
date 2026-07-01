/**
 * IOS toolbar tests.
 * Uses WDIO test runner with Mocha framework.
 */
import gesture from '../helpers/gesture'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'

describe('Toolbar', () => {
  // Regression test for https://github.com/cybersemics/em/issues/3770
  // A diagonal/vertical swipe beginning on the fixed toolbar must not pan the page (which visually drags
  // the toolbar downward on iOS).
  it('is not draggable vertically by a swipe on the toolbar', async () => {
    // Create enough thoughts to make the page vertically scrollable.
    const thoughts = Array.from({ length: 40 }, (_, i) => `  - thought ${i + 1}`).join('\n')
    await paste(thoughts)
    await waitForEditable('thought 1')
    await hideKeyboardByTappingDone()

    // Scroll the page down so a downward drag has room to scroll it further. Assert the page is actually
    // scrollable so the test cannot silently pass on a non-scrollable page.
    const scrollBefore = await browser.execute(() => {
      window.scrollTo(0, 300)
      return window.scrollY
    })
    expect(scrollBefore).toBeGreaterThan(0)

    // Swipe downward starting at the center of the toolbar.
    const toolbar = await browser.$('[data-testid="toolbar"]').getElement()
    const rect = await browser.getElementRect(toolbar.elementId)
    await gesture('d', { xStart: rect.x + rect.width / 2, yStart: rect.y + rect.height / 2, segmentLength: 150 })

    // The vertical drag on the toolbar must not scroll (drag) the page.
    const scrollAfter = await browser.execute(() => window.scrollY)
    expect(scrollAfter).toBe(scrollBefore)
  })
})
