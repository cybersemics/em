import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import emulate from '../helpers/emulate'
import exportThoughts from '../helpers/exportThoughts'
import longPressThought from '../helpers/longPressThought'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
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

  it('keeps the Command Center open and applies formatting when a text formatting command is run on a multiselection', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    const a = await waitForEditable('a')
    const b = await waitForEditable('b')

    await longPressThought(a, { edge: 'right' })
    await longPressThought(b, { edge: 'right' })

    // Wait for the Command Center to show the multiselection before tapping a formatting command.
    await page.waitForFunction(
      () => {
        const panel = document.querySelector('[data-testid=command-center-panel]')
        return panel?.textContent?.includes('2 thoughts selected') ?? false
      },
      { timeout: 6000 },
    )

    // Tap Bold on the toolbar to format the multiselection.
    await click('[data-testid="toolbar-icon"][aria-label="Bold"]')

    // Wait past the alert auto-dismiss delay (Alert.tsx clearDelay defaults to 5000ms). Previously a multicursor
    // command on mobile fell through to the desktop alert branch and dispatched the "n thoughts selected" alert,
    // which auto-dismissed and cleared the multicursors, closing the Command Center a few seconds later (#3995 Issue B).
    await new Promise(resolve => setTimeout(resolve, 6000))

    // The Command Center should still be open with the multiselection intact.
    const panelText = await page.$eval('[data-testid=command-center-panel]', el => el.textContent)
    expect(panelText).toContain('2 thoughts selected')

    // The formatting should have been applied to both selected thoughts.
    const output = await exportThoughts()
    expect(output).toContain('**a**')
    expect(output).toContain('**b**')
  })
})
