/**
 * Paste the given clipboard contents into the currently-editing thought, by dispatching a real paste event.
 *
 * This is a proxy for a system paste rather than the thing itself. The native edit menu could not be summoned
 * by an automated long press, and `navigator.clipboard.read()` raises a native paste confirmation that no
 * automated tap can satisfy, so the system pasteboard is unreachable from the Safari suite. Passing the
 * contents the app itself wrote still exercises the real paste handler over a real payload, which is the half
 * of a copy and paste round trip that reading the clipboard alone does not cover.
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
