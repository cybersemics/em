import { KnownDevices } from 'puppeteer'
import command from '../helpers/command'
import deviceEmulation from '../helpers/deviceEmulation'
import { page } from '../session'

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

it('lets the genie out from the Command Universe Help button and puts it back', async () => {
  await command('openMobileCommandUniverse')
  await page.waitForSelector('button[aria-label="Help"][aria-pressed="false"]', { visible: true })

  await page.click('button[aria-label="Help"]')
  // The genie is out once its lazily loaded canvas has drawn a frame.
  await page.waitForSelector('[data-testid="help-genie"][aria-busy="false"] canvas')
  expect(await page.$eval('button[aria-label="Help"]', el => el.getAttribute('aria-pressed'))).toBe('true')

  await page.click('button[aria-label="Help"]')
  await page.waitForSelector('[data-testid="help-genie"]', { hidden: true })
  expect(await page.$eval('button[aria-label="Help"]', el => el.getAttribute('aria-pressed'))).toBe('false')
})
