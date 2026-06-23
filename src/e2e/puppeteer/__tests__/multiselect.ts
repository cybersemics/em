import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import emulate from '../helpers/emulate'
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

  // Regression test for https://github.com/cybersemics/em/issues/3993
  // When Select All is active, the native copy handler must copy all selected thoughts, not just the focused cursor.
  // .skip keeps normal CI green while the test is red; remove the .skip when the fix lands.
  it('copies all selected thoughts when Select All is active', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    // place the cursor on b, then select all thoughts at the current level
    await clickThought('b')
    await command('selectAll')

    // The native copy event fires on the focused editable (permitDefault on copyCursor). Capture the
    // clipboard data it writes. With a multicursor active it must export all selected thoughts.
    const copiedText = await page.evaluate(() => {
      const editable = Array.from(document.querySelectorAll('[data-editable]')).find(
        el => el.textContent === 'b',
      ) as HTMLElement
      editable.focus()
      // collapse the caret inside b, mirroring the real desktop copy where the edited thought keeps focus
      const range = document.createRange()
      range.selectNodeContents(editable)
      range.collapse(true)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
      const clipboardData = new DataTransfer()
      editable.dispatchEvent(new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true }))
      return clipboardData.getData('text/plain')
    })

    expect(copiedText).toContain('a')
    expect(copiedText).toContain('b')
    expect(copiedText).toContain('c')
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
