import tap from './tap'
import tapEditMenuItem from './tapEditMenuItem'
import waitForElement from './waitForElement'

/** The thought em is currently editing. */
const EDITING = '[data-editing=true] [data-editable]'

/** Pastes the system pasteboard into the thought being edited, via the native iOS edit menu. */
const pasteFromEditMenu = async (): Promise<void> => {
  // One tap raises the menu on a thought already in edit mode; a second tap would dismiss it.
  await tap(await waitForElement(EDITING), { pointerType: 'touch' })
  await tapEditMenuItem('Paste')
}

export default pasteFromEditMenu
