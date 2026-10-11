import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import clickToolbar from '../helpers/clickToolbar'
import deviceEmulation from '../helpers/deviceEmulation'
import disableAutomationOptimizations from '../helpers/disableAutomationOptimizations'
import newThought from '../helpers/newThought'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 60000 })

describe('Toolbar animation', () => {
  deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

  it('preserves editing and executes a press spanning the icon animation ending', async () => {
    await disableAutomationOptimizations()
    await newThought()
    await clickToolbar('Italic')

    const icon = await waitForSelector('[data-testid="toolbar-icon"][aria-label="Italic"] svg')
    if (!icon) throw new Error('Italic icon was not rendered.')

    await click(icon, { hold: true })
    await page.waitForFunction((svg: Element) => !svg.isConnected, {}, icon)
    await page.touchscreen.touchEnd()

    expect(await page.$eval('[data-editable]', editable => document.activeElement === editable)).toBe(true)
    expect(
      await page.$eval('[data-testid="toolbar-icon"][aria-label="Italic"]', button =>
        button.getAttribute('data-active'),
      ),
    ).toBe('false')
  })
})
