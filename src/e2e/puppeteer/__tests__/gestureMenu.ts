import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import emulate from '../helpers/emulate'
import gesture from '../helpers/gesture'
import paste from '../helpers/paste'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('gesture menu', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 15 Pro landscape'])
  })

  // https://github.com/cybersemics/em/issues/3678
  it('adds left safe area padding to gesture menu content', async () => {
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--spacing-safe-area-left', '48px')
    })

    await paste('Hello')
    await clickThought('Hello')
    await gesture('rdldrd', { hold: true, yStart: 150 })
    await waitForSelector('[data-testid=popup-value]')

    const paddingLeft = await page.$eval('[data-testid=gesture-menu-content]', el => getComputedStyle(el).paddingLeft)

    expect(parseFloat(paddingLeft)).toBeGreaterThan(70)
  })
})
