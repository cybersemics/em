import { KnownDevices } from 'puppeteer'
import colors from '../../../colors.config'
import { EM_TOKEN } from '../../../constants'
import rgbaToHex from '../../../util/rgbaToHex'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import command from '../helpers/command'
import deviceEmulation from '../helpers/deviceEmulation'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
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

// https://github.com/cybersemics/em/issues/5850
it('the first gesture after a toolbar dropdown is closed is executed', async () => {
  await paste(`
    - a
    - b
    - c
  `)

  await clickThought('b')

  await clickToolbar('Sort Picker', 'Alphabetical')
  await waitForSelector('[aria-label="sort options"]', { hidden: true })

  await gesture('rd')

  expect(await exportThoughts()).toBe(`
- =sort
  - Alphabetical
    - Asc
- a
- b
- ${''}
- c
`)
})

// https://github.com/cybersemics/em/issues/3625
it('tapping another toolbar button closes the open toolbar dropdown', async () => {
  await newThought('hello')

  await clickToolbar('Text Color')
  await waitForSelector('[aria-label="text color swatches"]')

  await clickToolbar('Bold')
  await waitForEditable('<b>hello</b>')

  try {
    await waitForSelector('[aria-label="text color swatches"]', { hidden: true, timeout: 3000 })
  } catch {
    throw new Error('Expected the Text Color dropdown to close after tapping Bold, but it is still open.')
  }
})

// https://github.com/cybersemics/em/issues/5977
it('tapping a thought beside an open toolbar dropdown moves the cursor to it', async () => {
  await paste(`
    - aaa
    - bbb
  `)

  await clickThought('bbb')

  await clickToolbar('Sort Picker')
  const sortOptions = await waitForSelector('[aria-label="sort options"]')

  // The tap only has something to fall through if the thought is in the horizontal band of the open dropdown.
  const thoughtBox = await (await waitForSelector('::-p-text(aaa)'))!.boundingBox()
  const sortOptionsBox = await sortOptions!.boundingBox()
  const thoughtCenterY = thoughtBox!.y + thoughtBox!.height / 2
  expect(thoughtCenterY).toBeGreaterThan(sortOptionsBox!.y)
  expect(thoughtCenterY).toBeLessThan(sortOptionsBox!.y + sortOptionsBox!.height)

  await click('::-p-text(aaa)')

  expect(await getEditingText()).toBe('aaa')
})

// https://github.com/cybersemics/em/issues/5977
it('keeps the rightmost color reachable at the end of a customized toolbar', async () => {
  await paste('- One')
  await paste(
    [EM_TOKEN, 'Settings'],
    `- Toolbar
      - undo
      - redo
      - bold
      - italic
      - underline
      - strikethrough
      - code
      - textColor`,
  )
  await command('home')
  await clickThought('One')

  await clickToolbar('Text Color')
  const redSelector = '[aria-label="text color swatches"] [aria-label="red"]'
  const red = await waitForSelector(redSelector)
  const redBox = await red!.boundingBox()
  expect(redBox!.x).toBeGreaterThanOrEqual(0)
  expect(redBox!.x + redBox!.width).toBeLessThanOrEqual(page.viewport()!.width)

  await click(redSelector)
  await waitForEditable(`<font color="${rgbaToHex(colors.light.red)}">One</font>`)
})

// https://github.com/cybersemics/em/issues/5977
it('scrolls the toolbar when a swipe starts on a color swatch', async () => {
  await paste('- One')
  await clickThought('One')
  await clickToolbar('Text Color')
  const scrollLeftBefore = await page.$eval('[data-testid="toolbar"]', toolbar => toolbar.scrollLeft)

  await gesture('l', { target: '[aria-label="text color swatches"] [aria-label="blue"]' })
  await page.evaluate(() => new Promise(requestAnimationFrame))

  const scrollLeftAfter = await page.$eval('[data-testid="toolbar"]', toolbar => toolbar.scrollLeft)
  expect(scrollLeftAfter).toBeGreaterThan(scrollLeftBefore)
})
