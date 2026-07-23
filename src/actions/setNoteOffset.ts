import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Sets the note caret offset without affecting undo history. */
const setNoteOffset = (state: State, { value }: { value: number | null }): State => ({
  ...state,
  noteOffset: value,
})

/** Action-creator for setNoteOffset. */
export const setNoteOffsetActionCreator =
  (payload: Parameters<typeof setNoteOffset>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setNoteOffset', ...payload })

export default setNoteOffset

registerActionMetadata('setNoteOffset', {
  undoable: false,
})
