import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import deviceEmulation from '../helpers/deviceEmulation'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 60000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

/** Returns the value of the thought that the given toolbar dropdown option is rendered on top of, or null if the option covers no thought. A tap is dispatched at the center of the option, so the thought under that point is the one it would fall through to. */
const thoughtUnderDropdownOption = (selector: string) =>
  page.evaluate((selector: string) => {
    const option = document.querySelector(selector)
    if (!option) throw new Error(`Dropdown option not found for selector: ${selector}`)
    const { left, top, width, height } = option.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    return (
      Array.from(document.querySelectorAll('[data-editable]')).find(editable => {
        const rect = editable.getBoundingClientRect()
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      })?.textContent ?? null
    )
  }, selector)

// https://github.com/cybersemics/em/issues/5608
// The Bullet Style dropdown stands in for the Letter Case dropdown of the issue. The browser synthesizes a click
// from a tap that was allowed to complete, and that click only reaches the thought when the tapped option is no
// longer under the finger by the time it is dispatched. Bullet Style closes on selection in every browser, while
// Letter Case only closes on Mobile Safari.
it('tapping a toolbar dropdown option does not move the cursor to the thought underneath it', async () => {
  // The thoughts are long enough to reach under the dropdown, which opens below the toolbar button it belongs to.
  await paste(`
    - alpha bravo charlie delta
    - echo foxtrot golf hotel
    - india juliett kilo lima
    - mike november oscar papa
    - quebec romeo sierra tango
  `)

  await clickThought('quebec romeo sierra tango')

  await clickToolbar('Bullet Style')

  const optionSelector = '[aria-label="bullet style options"] [aria-label="Numbers"]'
  // The tap has nothing to fall through to unless the option really does cover a thought.
  expect(await thoughtUnderDropdownOption(optionSelector)).toBe('alpha bravo charlie delta')

  await click(optionSelector)

  // the numbered bullet that Numbers renders in place of the default bullet
  await waitForSelector('[aria-label="bullet-glyph"][data-bullet="ordered"]')

  expect(await getEditingText()).toBe('quebec romeo sierra tango')
})
