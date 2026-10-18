/** Covers the dialog title, which sits on one line between the header's buttons and so is sized to fit them rather than wrapped (see useFitText). This needs a real browser, because fitting depends on layout and on the canvas measuring text, neither of which jsdom implements. */
import { KnownDevices } from 'puppeteer'
import command from '../helpers/command'
import deviceEmulation from '../helpers/deviceEmulation'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 13'])

const TITLE = '::-p-aria([name="Commands"][role="heading"])'
const FORWARD = '::-p-aria([name="Forward"][role="button"])'
const HELP = '::-p-aria([name="Help"][role="button"])'

/** Reads the title's font size and its box against the header buttons on either side of it. */
const measureTitle = async () => {
  const title = await page.$eval(TITLE, el => {
    const box = el.getBoundingClientRect()
    return {
      fontSize: parseFloat(getComputedStyle(el).fontSize),
      left: box.left,
      right: box.right,
      truncated: el.scrollWidth > el.clientWidth,
    }
  })
  const forwardRight = await page.$eval(FORWARD, el => el.getBoundingClientRect().right)
  const helpLeft = await page.$eval(HELP, el => el.getBoundingClientRect().left)
  return { ...title, forwardRight, helpLeft }
}

it('the dialog title follows the font size while it fits between the header buttons', async () => {
  // 16 → 18. On an iPhone 13 the title fits at its full size up to font size 19.
  await command('fontSizeUp')
  await command('fontSizeUp')

  await command('openMobileCommandUniverse')
  await waitForSelector(TITLE)

  // 1.25rem at font size 18.
  expect((await measureTitle()).fontSize).toBe(22.5)
})

it('the dialog title shrinks to fit between the header buttons at a large font size', async () => {
  // 16 → 35, where the title at 1.25rem (43.75px) is wider than the room the buttons leave on a phone.
  for (let i = 0; i < 19; i++) {
    await command('fontSizeUp')
  }

  await command('openMobileCommandUniverse')
  await waitForSelector(TITLE)

  const title = await measureTitle()
  expect(title.fontSize).toBeLessThan(43.75)
  expect(title.left).toBeGreaterThanOrEqual(title.forwardRight)
  expect(title.right).toBeLessThanOrEqual(title.helpLeft)
  expect(title.truncated).toBe(false)
})
