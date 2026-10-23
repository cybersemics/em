/** Toolbar tests. */
import $ from '../helpers/$'
import clickThought from '../helpers/clickThought'
import holdAndSwipe from '../helpers/holdAndSwipe'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import swipeToolbar from '../helpers/swipeToolbar'
import tapToolbar from '../helpers/tapToolbar'
import waitForElement from '../helpers/waitForElement'

/** Get the horizontal scroll position of the toolbar. */
const getToolbarScrollLeft = (): Promise<number> =>
  browser.execute(() => document.getElementById('toolbar')!.scrollLeft)

describe('Toolbar', () => {
  // https://github.com/cybersemics/em/issues/3461
  it('scrolls when swiped after a long press', async () => {
    await newThought('a')

    const toolbar = await $('[data-testid="toolbar"]').getElement()
    await holdAndSwipe(toolbar, { dx: -200, holdMs: 1000 })

    const scrollLeft = await browser.execute(() => document.querySelector('[data-testid="toolbar"]')!.scrollLeft)
    expect(scrollLeft).toBeGreaterThan(0)
  })

  // https://github.com/cybersemics/em/issues/3462
  it('Can be scrolled while the Text Color picker is open', async () => {
    await paste('- a')
    await clickThought('a')

    await tapToolbar('Text Color')
    await waitForElement('[aria-label="Color Picker"]')

    const scrollLeft = await getToolbarScrollLeft()
    await swipeToolbar('left')

    expect(await getToolbarScrollLeft()).toBeGreaterThan(scrollLeft)
  })
})
