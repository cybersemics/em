import { KnownDevices } from 'puppeteer'
import sleep from '../../../util/sleep'
import emulate from '../helpers/emulate'
import longPressThought from '../helpers/longPressThought'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import waitForAlertContent from '../helpers/waitForAlertContent'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('multiselect', () => {
  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        `)

    await multiselectThoughts(['a', 'b'])

    const highlightedBullets = await page.$$('[aria-label="bullet"][data-highlighted="true"]')
    const alertContent = await page.$eval('[data-testid=alert-content]', el => el.textContent)

    expect(highlightedBullets.length).toBe(2)
    expect(alertContent).toContain('2 thoughts selected')
  })

  // Regression test for https://github.com/cybersemics/em/issues/3612
  // The multiselect indicator alert must not auto-dismiss after 5s while the selection is active.
  // .skip keeps normal CI green while the test is red; remove the .skip when the fix lands.
  it('should not auto-dismiss the multiselect alert while a selection is active', async () => {
    await paste(`
        - a
        - b
        `)

    await multiselectThoughts(['a'])

    await waitForAlertContent('1 thought selected')

    // wait past the default 5000ms alert auto-dismiss timeout
    await sleep(6000)

    const highlightedBullets = await page.$$('[aria-label="bullet"][data-highlighted="true"]')
    const alertContent = await page.evaluate(() => {
      const el = document.querySelector('[data-testid=alert-content]')
      return el ? el.textContent : null
    })

    expect(alertContent).toContain('1 thought selected')
    expect(highlightedBullets.length).toBe(1)
  })
})

describe('mobile only', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 15 Pro'])
  }, 10000)

  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    const a = await waitForEditable('a')
    const b = await waitForEditable('b')

    await longPressThought(a, { edge: 'right' })
    await longPressThought(b, { edge: 'right' })

    // In CI, sometimes the count of highlighted bullets are incorrect. The selector query runs immediately after both long presses, but react might not have finished re-rendering all bullet components.
    // Wait for the Command Center to show "2 thoughts selected" before we query for highlighted bullets.
    await page.waitForFunction(
      () => {
        const panel = document.querySelector('[data-testid=command-center-panel]')
        return panel?.textContent?.includes('2 thoughts selected') ?? false
      },
      { timeout: 6000 },
    )

    const highlightedBullets = await page.$$('[aria-label="bullet"][data-highlighted="true"]')

    expect(highlightedBullets.length).toBe(2)
  })
})
