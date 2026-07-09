import { KnownDevices } from 'puppeteer'
import { WindowEm } from '../../../initialize'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import emulate from '../helpers/emulate'
import longPressThought from '../helpers/longPressThought'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import press from '../helpers/press'
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
  // The multiselect indicator must never auto-dismiss, otherwise closing it would clear the selection.
  it('should not auto-dismiss the multiselect alert while a selection is active', async () => {
    await paste(`
        - a
        - b
        `)

    await multiselectThoughts(['a'])

    await waitForAlertContent('1 thought selected')

    // The multiselect indicator is dispatched with clearDelay: null so it never auto-dismisses.
    // Auto-dismiss is globally disabled in tests (testFlags.preventAutoDismiss), which mocks any finite
    // delay to Infinity. A regression that dropped the intentional clearDelay: null would therefore
    // resolve to Infinity instead of null, so asserting null catches it.
    const clearDelay = await page.evaluate(() => (window.em as WindowEm).store.getState().alert?.clearDelay)
    expect(clearDelay).toBeNull()

    const highlightedBullets = await page.$$('[aria-label="bullet"][data-highlighted="true"]')
    const alertContent = await page.$eval('[data-testid=alert-content]', el => el.textContent)

    expect(alertContent).toContain('1 thought selected')
    expect(highlightedBullets.length).toBe(1)
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

  // Regression test for https://github.com/cybersemics/em/issues/3993 (Desktop Safari)
  // The copy command must write text/html and the text/em marker to the clipboard itself, rather than
  // relying on the native copy event of the focused editable. Safari (like headless Chrome) does not fire
  // a copy event for a collapsed contenteditable selection, so without an explicit text/html the browser
  // synthesizes its own html on paste, which shadows the plain text and breaks structured paste.
  it('writes html and the em marker to the clipboard when Select All is active', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    // intercept clipboardData.setData so we can observe what the copy command writes, regardless of
    // whether a native copy event fires (it does not for a collapsed selection in headless Chrome)
    await page.evaluate(() => {
      const win = window as typeof window & { __copied: Record<string, string> }
      win.__copied = {}
      const original = DataTransfer.prototype.setData
      DataTransfer.prototype.setData = function (type: string, data: string) {
        win.__copied[type] = data
        return original.call(this, type, data)
      }
    })

    // place the cursor on b, then select all thoughts at the current level and copy
    await clickThought('b')
    await command('selectAll')
    await press('c', { meta: true })

    const copied = await page.evaluate(() => (window as typeof window & { __copied: Record<string, string> }).__copied)

    // the em marker must be present so importData treats the html as em-structured content
    expect(copied['text/em']).toBeDefined()
    // the html must contain all selected thoughts so structured paste reconstructs the full selection
    expect(copied['text/html']).toContain('a')
    expect(copied['text/html']).toContain('b')
    expect(copied['text/html']).toContain('c')
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
