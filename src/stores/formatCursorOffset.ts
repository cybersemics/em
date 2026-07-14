import ministore from './ministore'

/** The caret offset to persist for the thought edit produced by an in-progress whole-thought execCommand format
 * (color, bold, italic, etc). Null when no such format is in progress.
 *
 * The browser's execCommand fires a synchronous input event while the entire thought is selected, so the Editable
 * onChange handler would otherwise read the end-of-thought offset (via selection.offsetThought()) and persist it as
 * state.cursorOffset. Because formatting edits preserve the cursor offset on undo, the caret would then jump to the
 * end of the thought when the format is undone. The formatSelection action captures the caret offset before it
 * expands the selection and stores it here; Editable's onChange prefers it over the live (whole-thought) selection (#4628). */
const formatCursorOffset = ministore<number | null>(null)

/** Pending timer that clears the stored offset on the next macrotask. See setFormatCursorOffset. */
let clearTimer: ReturnType<typeof setTimeout> | undefined

/** Stores the caret offset to persist for the in-progress whole-thought format and schedules a deferred clear.
 *
 * The clear is deferred to the next macrotask (rather than applied synchronously) because mobile WebViews dispatch
 * the execCommand input event asynchronously, after formatSelection returns. Clearing synchronously would drop the
 * offset before those async edits land. Deferring keeps it available until they land, while still clearing it before
 * any subsequent user interaction, which occurs in a later macrotask — mirroring endBatchEditing (#4628). */
export const setFormatCursorOffset = (offset: number | null) => {
  if (clearTimer) clearTimeout(clearTimer)
  formatCursorOffset.update(offset)
  clearTimer = setTimeout(() => {
    clearTimer = undefined
    formatCursorOffset.update(null)
  })
}

export default formatCursorOffset
