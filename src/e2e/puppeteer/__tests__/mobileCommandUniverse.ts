import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import deviceEmulation from '../helpers/deviceEmulation'
import gesture from '../helpers/gesture'
import reloadWithProductionTiming from '../helpers/reloadWithProductionTiming'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 })

describe('mobile Command Universe', () => {
  deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

  // https://github.com/cybersemics/em/issues/4200
  it('scales the grid in while returning from a settled command detail page', async () => {
    await reloadWithProductionTiming()
    await gesture('rdld')
    await waitForSelector('button[aria-label="New Thought"]')
    await click('button[aria-label="New Thought"]')
    await page.waitForFunction(
      () => document.activeElement?.tagName === 'H3' && document.activeElement.textContent === 'New Thought',
      { timeout: 6000 },
    )

    const gridScalePromise = page.waitForFunction(
      () => {
        const grid = document.querySelector('[data-testid="command-universe-grid-surface"]')
        if (!grid) return false
        const style = getComputedStyle(grid)
        const opacity = Number(style.opacity)
        return opacity > 0.2 && opacity < 0.6 ? new DOMMatrixReadOnly(style.transform).a : false
      },
      { timeout: 6000 },
    )
    await click('button[aria-label="Back"]')
    const gridScaleHandle = await gridScalePromise

    const gridScale = await gridScaleHandle.jsonValue()
    expect(gridScale).toBeGreaterThan(1.2)
  })
})
