import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setNoteFocus from '../actions/setNoteFocus'
import { anyChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import resolveNoteKey from '../selectors/resolveNoteKey'
import resolveNotePath from '../selectors/resolveNotePath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import { deleteThoughtActionCreator as deleteThought } from './deleteThought'
import { setDescendantActionCreator as setDescendant } from './setDescendant'

/** Toggles the caret between the cursor and its note. */
const toggleNote = (state: State): State => {
  const path = state.cursor!
  const targetPath = resolveNotePath(state, path)
  const targetThought = targetPath ? getThoughtById(state, head(targetPath)) : undefined
  const offset = anyChild(state, targetThought?.id)?.value.length ?? 0

  return setNoteFocus(state, state.noteFocus ? { value: false } : { value: true, offset })
}

/** Action-creator for toggleNote. */
export const toggleNoteActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const path = state.cursor
  if (!path) return

  const targetPath = resolveNotePath(state, path)
  const targetThought = targetPath ? getThoughtById(state, head(targetPath)) : undefined
  const { noteKey } = resolveNoteKey(state, head(path))
  const offset = anyChild(state, targetThought?.id)?.value.length ?? 0

  dispatch([
    offset
      ? null
      : state.noteFocus && targetThought
        ? deleteThought({ pathParent: path, thoughtId: targetThought.id })
        : setDescendant({ path, values: [noteKey, ''] }),
    { type: 'toggleNote' },
  ])
}

export default toggleNote

// Register this action's metadata
registerActionMetadata('toggleNote', {
  undoable: false,
  isNavigation: true,
})
