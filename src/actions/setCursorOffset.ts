import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import setCursor from './setCursor'

/** The payload of setCursorOffset. */
interface SetCursorOffsetPayload {
  /** The plain-text offset of the caret within the cursor thought. */
  offset: number
  /** Opens the keyboard, i.e. enters edit mode, as a tap does. */
  isKeyboardOpen?: boolean
  /** Keeps the multiselection, as setCursor does. */
  preserveMulticursor?: boolean
}

/**
 * Places the caret at an offset within the cursor thought, without moving the cursor to another thought. It is kept
 * apart from setCursor so that a caret move within a thought can be told apart from a move to another thought, such as
 * by the undo history. It does exactly what setCursor does when the cursor does not change.
 */
const setCursorOffset = (
  state: State,
  { offset, isKeyboardOpen, preserveMulticursor }: SetCursorOffsetPayload,
): State => setCursor(state, { path: state.cursor, offset, isKeyboardOpen, preserveMulticursor })

/** Action-creator for setCursorOffset. */
export const setCursorOffsetActionCreator =
  (payload: SetCursorOffsetPayload): Thunk =>
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
