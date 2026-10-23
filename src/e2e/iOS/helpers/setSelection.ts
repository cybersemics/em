/** Resulting selection state read back from `window.getSelection()`. */
interface SelectionState {
  /** The selected text. */
  text: string
  /** Selection type: `Range` when text is selected, `Caret`/`None` otherwise. */
  type: string
  rangeCount: number
}

/**
 * Select a range of text `[start, end)` inside the currently-editing em editable, by character offset.
 * Works for any boundary — a single letter, a word, a sentence, or any two arbitrary points.
 *
 * Mirrors the web helper `src/e2e/puppeteer/helpers/setSelection.ts`: a pure DOM-range selection. On iOS
 * this shows the selection (and handles) but not the native edit menu — that menu is driven by WebKit's
 * touch recognizers, not DOM mutations. To raise it, follow with `showEditMenu()`.
 *
 * Assumes the editable is in editing mode (focused) and the WKWebView context is active.
 * Uses the global `browser` object from WDIO.
 *
 * @param start Character offset where the selection begins.
 * @param end Character offset where the selection ends.
 * @param options.note Select in the note being edited rather than the thought.
 * @returns The resulting selection state.
 */
const setSelection = async (
  start: number,
  end: number,
  { note = false }: { note?: boolean } = {},
): Promise<SelectionState> => {
  const raw = await browser.execute(
    (from: number, to: number, selector: string) => {
      const editable = document.querySelector(selector)
      const textNode = editable?.firstChild
      if (!textNode || textNode.nodeType !== 3) {
        return JSON.stringify({ error: 'No editing text node found — is the editable focused?' })
      }
      const range = document.createRange()
      range.setStart(textNode, from)
      range.setEnd(textNode, to)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      return JSON.stringify({
        text: selection ? selection.toString() : '',
        type: selection ? selection.type : 'None',
        rangeCount: selection ? selection.rangeCount : 0,
      })
    },
    start,
    end,
    note ? '[aria-label="note-editable"]' : '[data-editing=true] [data-editable]',
  )

  const result = JSON.parse(raw) as SelectionState & { error?: string }
  if (result.error) throw new Error(result.error)
  return { text: result.text, type: result.type, rangeCount: result.rangeCount }
}

export default setSelection
export type { SelectionState }
