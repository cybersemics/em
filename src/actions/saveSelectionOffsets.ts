import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import parentContextId from '../selectors/parentContextId'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Records a snapshot of the browser text selection within the cursor thought, or clears it. See state.selectionOffsets. */
const saveSelectionOffsets = (state: State, { selectionOffsets }: { selectionOffsets: State['selectionOffsets'] }) => ({
  ...state,
  selectionOffsets,
})

/**
 * Action-creator for saveSelectionOffsets. Reads the selection offsets from the document, so it must be dispatched
 * while the selection is still on the thought, i.e. before the UI that prompted it takes the focus.
 */
export const saveSelectionOffsetsActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  // the displayed thought, since that is what <Editable> labels the DOM element with
  const thoughtId = state.cursor && parentContextId(state, state.cursor)

  // Only a selection on the cursor thought is worth recording, since that is the only thought the offsets index into.
  // offsetStart and offsetEnd call getRangeAt(0), which throws when the document has no range at all.
  const isOnCursorThought = !!thoughtId && selection.isActive() && selection.isOnEditable(thoughtId)
  const start = isOnCursorThought ? selection.offsetStart() : null
  const end = isOnCursorThought ? selection.offsetEnd() : null

  // Clear the snapshot when there is no selection to record, so that a stale one is never mistaken for a current one.
  dispatch({
    type: 'saveSelectionOffsets',
    selectionOffsets: thoughtId && start !== null && end !== null ? { thoughtId, start, end } : null,
  })
}

export default _.curryRight(saveSelectionOffsets)

// Register this action's metadata
registerActionMetadata('saveSelectionOffsets', {
  undoable: false,
})
