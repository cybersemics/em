/**
 * Paste the given clipboard contents into the currently-editing thought, by dispatching a real paste event.
 *
 * This is a proxy for a system paste rather than the thing itself. Reaching the real pasteboard was tried and
 * abandoned rather than ruled out: em binds the long press to drag and drop, so it consumes the press before
 * the native edit menu appears, and `navigator.clipboard.read()` never settled. Summoning the menu from a
 * non-collapsed selection, as `showEditMenu` does, was not tried. Passing the contents the app itself wrote
 * exercises the real paste handler over a real payload, which is the half of a copy and paste round trip that
 * reading the clipboard alone does not cover.
 *
 * Uses the global `browser` object from WDIO.
 */
const dispatchPaste = async (contents: Record<string, string>): Promise<void> => {
  const error = await browser.execute((contents: Record<string, string>) => {
    const editable = document.querySelector('[data-editing=true] [data-editable]')
    if (!editable) return 'No editing thought to paste into.'
    const clipboardData = new DataTransfer()
    Object.entries(contents).forEach(([type, data]) => clipboardData.setData(type, data))
    editable.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }))
    return null
  }, contents)

  if (error) throw new Error(error)
}

export default dispatchPaste
