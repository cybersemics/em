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
  await tap(await waitForElement(EDITING), { pointerType: 'touch', y: 60 })

  const context = ((await browser.getContext()) as string) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  try {
    const paste = await browser.$('//*[@name="Paste"]')
    try {
      await paste.waitForExist({ timeout: 8000 })
    } catch {
      const shown = (
        await Promise.all(
          MENU_ITEMS.map(async name => ((await browser.$(`//*[@name="${name}"]`).isExisting()) ? name : null)),
        )
      ).filter(Boolean)
      throw new Error(
        shown.length ? `the native edit menu offered ${shown.join(', ')} but no Paste` : 'no native edit menu appeared',
      )
    }
    await paste.click()
  } finally {
    await browser.switchContext(context)
  }
}

export default pasteFromEditMenu
