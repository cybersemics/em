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

/** Starts a batch of edits that should be merged into a single undo step. */
export const startBatchEditing = () => batchEditing.update({ batching: true, edited: false })

/** Ends the current batch of edits. */
export const endBatchEditing = () => batchEditing.update({ batching: false, edited: false })

/** Returns the mergePrev value for an edit dispatched during a possible batch, recording that an edit has occurred. Returns false when not batching or for the
 * first edit in a batch (which starts a new undo step), and true for subsequent edits in the same batch (which merge into it). */
export const mergeBatchEditing = (): boolean => {
  const { batching, edited } = batchEditing.getState()
  if (!batching) return false
  if (!edited) batchEditing.update({ edited: true })
  return edited
}

export default batchEditing
