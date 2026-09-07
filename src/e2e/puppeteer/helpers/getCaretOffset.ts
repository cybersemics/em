import { page } from '../session'

/** Returns the character offset of the caret within the thought being edited, or null if the caret is not in it. */
const getCaretOffset = (): Promise<number | null> =>
  page.evaluate(() => {
    const editable = document.querySelector('[data-editing=true] [data-editable]')
    const selection = window.getSelection()
    if (!editable || !selection?.focusNode || !editable.contains(selection.focusNode)) return null
    // measure the offset relative to the whole thought, since focusOffset is relative to the focus node, which may be a text node nested in formatting tags or the editable itself
    const range = document.createRange()
    range.selectNodeContents(editable)
    range.setEnd(selection.focusNode, selection.focusOffset)
    return range.toString().length
  })

export default getCaretOffset
