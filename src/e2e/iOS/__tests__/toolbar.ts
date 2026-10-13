/**
 * IOS Safari toolbar tests.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import swipeToolbar from '../helpers/swipeToolbar'
import tapToolbar from '../helpers/tapToolbar'
import waitForElement from '../helpers/waitForElement'

/** Get the horizontal scroll position of the toolbar. */
const getToolbarScrollLeft = (): Promise<number> =>
  browser.execute(() => document.getElementById('toolbar')!.scrollLeft)

describe('Toolbar', () => {
  // https://github.com/cybersemics/em/issues/3462
  it.skip('Can be scrolled while the Text Color picker is open', async () => {
    await paste('- a')
    await clickThought('a')

    await tapToolbar('Text Color')
    await waitForElement('[aria-label="Color Picker"]')

    const scrollLeft = await getToolbarScrollLeft()
    await swipeToolbar('left')

    expect(await getToolbarScrollLeft()).toBeGreaterThan(scrollLeft)
  })
})
