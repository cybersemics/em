/** Toolbar tests. */
import $ from '../helpers/$'
import holdAndSwipe from '../helpers/holdAndSwipe'
import newThought from '../helpers/newThought'

describe('Toolbar', () => {
  // https://github.com/cybersemics/em/issues/3461
  it('scrolls when swiped after a long press', async () => {
    await newThought('a')

    const toolbar = await $('[data-testid="toolbar"]').getElement()
    await holdAndSwipe(toolbar, { dx: -200, holdMs: 1000 })

    const scrollLeft = await browser.execute(() => document.querySelector('[data-testid="toolbar"]')!.scrollLeft)
    expect(scrollLeft).toBeGreaterThan(0)
  })
})
