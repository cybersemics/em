import { browser } from '@wdio/globals'
import tap from './tap'
import waitForElement from './waitForElement'

/** The thought em is currently editing. */
const EDITING = '[data-editing=true] [data-editable]'

/** Menu items iOS may offer, probed only to describe a failure. */
const MENU_ITEMS = ['Cut', 'Copy', 'Paste', 'Replace…', 'Look Up', 'Select All']

/** Pastes the system pasteboard into the thought being edited, via the native iOS edit menu. */
const pasteFromEditMenu = async (): Promise<void> => {
  // One tap raises the menu on a thought already in edit mode; a second tap would dismiss it.
  await tap(await waitForElement(EDITING), { pointerType: 'touch' })

  const context = ((await browser.getContext()) as string) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  try {
    // The native edit menu exposes more than one element named Paste, so count matches with $$ rather than WebdriverIO's
    // strict $, which throws on more than one.
    const paste = '//*[@name="Paste"]'
    try {
      await browser.waitUntil(async () => (await browser.$$(paste).length) > 0, { timeout: 8000 })
    } catch {
      const shown = (
        await Promise.all(
          MENU_ITEMS.map(async name => ((await browser.$$(`//*[@name="${name}"]`).length) > 0 ? name : null)),
        )
      ).filter(Boolean)
      throw new Error(
        shown.length ? `the native edit menu offered ${shown.join(', ')} but no Paste` : 'no native edit menu appeared',
      )
    }
    // The first in document order is the one that takes the tap.
    await browser.$$(paste)[0].click()
  } finally {
    await browser.switchContext(context)
  }
}

export default pasteFromEditMenu
