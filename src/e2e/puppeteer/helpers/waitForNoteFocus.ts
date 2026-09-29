import { page } from '../session'

/** Waits for the caret to be in a note. */
const waitForNoteFocus = () =>
  page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'note-editable')

export default waitForNoteFocus
