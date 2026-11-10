import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/**
 * Places the caret at a plain-text offset within the cursor thought, and does nothing else. A move of the cursor to
 * another thought is setCursor's, and the other changes a tap within the thought can bring, such as opening the
 * keyboard, are dispatched as actions of their own (see setCursorOnThought in Editable). Keeping the two apart lets a
 * caret move within a thought be told apart from a move to another thought, such as by the undo history.
 */
const setCursorOffset = (state: State, { offset }: { offset: number }): State => ({
  ...state,
  cursorOffset: offset,
})

/** Action-creator for setCursorOffset. */
export const setCursorOffsetActionCreator =
  (payload: Parameters<typeof setCursorOffset>[1]): Thunk =>
  dispatch => {
    dispatch({ type: 'setCursorOffset', ...payload })
  }

export default _.curryRight(setCursorOffset)

// Registered like setCursor, as an undoable navigation, until the undo history records the caret positions on its
// patches. Without them, a caret move that is not an undo step would leave the next Undo with the moved offset.
registerActionMetadata('setCursorOffset', {
  undoable: true,
  isNavigation: true,
})
