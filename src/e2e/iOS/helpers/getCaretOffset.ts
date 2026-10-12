/**
 * Returns the character offset of the caret within the thought being edited, or null if the caret is not in it.
 * Uses the global browser object from WDIO.
 */
const getCaretOffset = async (): Promise<number | null> => {
  // WebDriver has no undefined on the wire, so a missing caret arrives as null.
  const offset = await browser.execute(() => {
    const editable = document.querySelector('[data-editing=true] [data-editable]')
    const selection = window.getSelection()
    if (!editable || !selection?.focusNode || !editable.contains(selection.focusNode)) return null
    // measure the offset relative to the whole thought, since focusOffset is relative to the focus node, which may be a text node nested in formatting tags or the editable itself
    const range = document.createRange()
    range.selectNodeContents(editable)
    range.setEnd(selection.focusNode, selection.focusOffset)
    return range.toString().length
  })
  return offset ?? null
}

export default getCaretOffset
