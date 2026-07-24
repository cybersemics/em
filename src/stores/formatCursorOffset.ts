import ministore from './ministore'

/** A store that carries the caret offset captured just before a whole-thought format operation (e.g. applying a
 * background or font color). It exists because formatSelection selects the entire thought before calling
 * document.execCommand, which fires an onChange in Editable whose selection.offsetThought() would otherwise resolve to
 * the end of the thought. Editable reads this store so the editThought (and therefore state.cursorOffset and the undo
 * patch) records the caret position the user actually left, keeping the caret in place when the format is undone (#4632). */
const formatCursorOffset = ministore<number | null>(null)

/** Pending timer that clears the stored offset on the next macrotask. See setFormatCursorOffset. */
let clearTimer: ReturnType<typeof setTimeout> | undefined

/** Sets the caret offset to persist for the format operation's edit, then clears it on the next macrotask.
 *
 * The clear is deferred (not synchronous) for the same reason batchEditing defers its close: on mobile WebViews the
 * editThought that document.execCommand triggers is dispatched asynchronously, after formatSelection returns. Clearing
 * synchronously would drop the offset before that edit reads it, letting the whole-thought end offset leak back in.
 * Deferring keeps the offset available until the (possibly async) edits have landed, while still clearing it well before
 * any subsequent user interaction, which occurs in a later macrotask. */
export const setFormatCursorOffset = (offset: number | null) => {
  if (clearTimer) clearTimeout(clearTimer)
  formatCursorOffset.update(offset)
  clearTimer = setTimeout(() => {
    clearTimer = undefined
    formatCursorOffset.update(null)
  })
}

export default formatCursorOffset
