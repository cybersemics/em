import ministore from './ministore'

/** State of the batch editing store. */
interface BatchEditing {
  /** Whether a batch of edits (e.g. a single ColorPicker application) is in progress and should be treated as a single undo step. */
  batching: boolean
  /** Whether at least one edit has been recorded since the current batch started. */
  edited: boolean
}

/** A store that signals that multiple execCommand operations are in progress and should be treated as a single edit. While batching, editThought actions
 * dispatched by thoughtChangeHandler in Editable (and the follow-up strip thunk in formatSelection) merge into a single undo step in undoRedoEnhancer (#3904).
 * The first edit in a batch starts a new undo step and subsequent edits merge into it, so a batch whose leading edit is a no-op (e.g. re-applying a background
 * color over an existing one, where the forced black text is unchanged) still forms its own undo step instead of merging into an unrelated prior step (#4620). */
const batchEditing = ministore<BatchEditing>({ batching: false, edited: false })

/** Pending timer that closes the current batch on the next macrotask. See endBatchEditing. */
let endBatchTimer: ReturnType<typeof setTimeout> | undefined

/** Starts a batch of edits that should be merged into a single undo step. */
export const startBatchEditing = () => {
  // Cancel a pending deferred close so the incoming edits are anchored to this fresh batch.
  if (endBatchTimer) {
    clearTimeout(endBatchTimer)
    endBatchTimer = undefined
  }
  batchEditing.update({ batching: true, edited: false })
}

/** Ends the current batch of edits.
 *
 * The close is deferred to the next macrotask rather than applied synchronously. On mobile WebViews (iOS
 * Capacitor/Safari, Android WebView) the editThought that document.execCommand triggers is dispatched
 * asynchronously, after this synchronous call returns. Closing the batch synchronously would leave those
 * edits outside the batch window, so mergeBatchEditing would return false for every one of them and a single
 * color application would split into multiple undo steps (and undo would land on a broken partial state).
 * Deferring keeps the batch open until the async edits have landed, while still closing it well before any
 * subsequent user interaction, which occurs in a later macrotask (#4620). */
export const endBatchEditing = () => {
  if (endBatchTimer) clearTimeout(endBatchTimer)
  endBatchTimer = setTimeout(() => {
    endBatchTimer = undefined
    batchEditing.update({ batching: false, edited: false })
  })
}

/** Returns the mergePrev value for an edit dispatched during a possible batch, recording that an edit has occurred. Returns false when not batching or for the
 * first edit in a batch (which starts a new undo step), and true for subsequent edits in the same batch (which merge into it). */
export const mergeBatchEditing = (): boolean => {
  const { batching, edited } = batchEditing.getState()
  if (!batching) return false
  if (!edited) batchEditing.update({ edited: true })
  return edited
}

export default batchEditing
