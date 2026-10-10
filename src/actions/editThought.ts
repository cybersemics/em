import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import { clientId } from '../data-providers/thoughtspaceSession'
import findDescendant from '../selectors/findDescendant'
import getSortPreference from '../selectors/getSortPreference'
import getSortedPlacement from '../selectors/getSortedPlacement'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDivider from '../util/isDivider'
import isEmptyOrEmojiOnly from '../util/isEmptyOrEmojiOnly'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import timestamp from '../util/timestamp'
import deleteAttribute from './deleteAttribute'
import deleteThought from './deleteThought'
import setCursor from './setCursor'
import updateThoughts from './updateThoughts'

export interface editThoughtPayload {
  cursorOffset?: number
  /** Force the Editable to re-render. */
  // TODO: This is used to force the Editable to re-render on generateThought, which co-opts clearThought during its pending state. Is there a better way to do this?
  force?: boolean
  /** Persist the note caret with the edit so undo and redo can restore it. */
  noteOffset?: number
  oldValue: string
  newValue: string
  path: SimplePath
  /** Isolate the edit in the undo history: it never merges with a contiguous edit on either side, so it is always its own undo step. Set on programmatic edits such as a generated thought, which are not part of the user's typing stream. */
  preventMerge?: boolean
}

/** Changes the text of an existing thought. */
const editThought = (
  state: State,
  { cursorOffset, force, noteOffset, oldValue, newValue, path }: editThoughtPayload,
  transaction?: ThoughtspaceTransaction,
) => {
  if (oldValue === newValue || isDivider(oldValue)) return state

  const editedThoughtId = head(path)

  const editedThought = getThoughtById(state, editedThoughtId)

  if (!editedThought) {
    console.error('editThought: Edited thought not found!')
    return state
  }

  const parentOfEditedThought = getThoughtById(state, editedThought.parentId)
  if (!parentOfEditedThought) {
    console.error('Parent not found')
    return state
  }

  // only calculate decendant thought when current edited thought is a metaprogramming attribute
  const thoughtIdForExistingMetaProgrammingThought =
    isAttribute(newValue) &&
    state.cursor &&
    head(state.cursor) === editedThought.id &&
    findDescendant(state, editedThought.parentId, newValue)

  // We do not want to create a duplicate metaprogramming thought within the same context. Instead this logic ensures we delete the current cursor thought and move the cursor to the existing one
  if (thoughtIdForExistingMetaProgrammingThought) {
    return reducerFlow([
      deleteThought({
        thoughtId: editedThoughtId,
        pathParent: parentOf(path),
      }),
      setCursor({
        path: thoughtToPath(state, thoughtIdForExistingMetaProgrammingThought as ThoughtId),
      }),
    ])(state, transaction)
  }

  const isNote = parentOfEditedThought.value === '=note'
  const sortPreference = getSortPreference(state, editedThought.parentId)
  const sortType = sortPreference.type
  const isValueEmptyOrEmojiOnly = isEmptyOrEmojiOnly(newValue)

  // The new value carries any formatting that was held while the thought was empty, so the held copy is dropped. The
  // key is omitted rather than set to undefined, which a JSON patch does not treat as a removal. See formatSelection.
  const { pendingFormat: _pendingFormat, ...editedUi } = state.thoughtUi[editedThought.id] ?? {}
  const thoughtUi = {
    ...editedUi,
    ...(editedThought.generating ? { generating: false, generatingPlaceholder: undefined } : null),
  }

  // If we're editing a note, the thought that owns the note is repositioned, since a Note-sorted context sorts its
  // children by their note value rather than their own.
  const noteParentThought = isNote ? getThoughtById(state, parentOfEditedThought.parentId) : null
  const repositionNoteParent = noteParentThought && getSortPreference(state, noteParentThought.parentId).type === 'Note'

  // Persist sort-driven moves directly. Created sorting preserves position because editing does not change creation time.
  const afterId =
    !isValueEmptyOrEmojiOnly && (sortType === 'Alphabetical' || sortType === 'Updated')
      ? getSortedPlacement(state, editedThought.parentId, newValue, { staleId: editedThought.id })
      : undefined
  const noteAfterId = repositionNoteParent
    ? getSortedPlacement(state, noteParentThought.parentId, newValue, { staleId: noteParentThought.id })
    : undefined

  // new state
  const stateNew: State = {
    ...state,
    // clear the clearThought state on edit instead of waiting till blur
    // otherwise activating clearThought after edit will toggle it off
    ...(state.cursorCleared ? { cursorCleared: false } : null),
    ...(force ? { editableNonce: state.editableNonce + 1 } : null),
    ...(noteOffset != null ? { noteOffset } : null),
  }

  const stateAfterUpdate = updateThoughts(
    stateNew,
    {
      cursorOffset,
      write: transaction => {
        if (afterId !== undefined) transaction.move(editedThought.id, { parentId: editedThought.parentId, afterId })
        transaction.payload(editedThought.id, { value: newValue, lastUpdated: timestamp(), updatedBy: clientId })
        if (noteAfterId !== undefined && noteParentThought) {
          transaction.move(noteParentThought.id, { parentId: noteParentThought.parentId, afterId: noteAfterId })
          transaction.payload(noteParentThought.id, { lastUpdated: timestamp(), updatedBy: clientId })
        }
      },
      thoughtUiUpdates: { [editedThought.id]: thoughtUi },
    },
    transaction,
  )

  // remove =done when thought is edited to empty to prevent strikethrough on the placeholder
  return newValue === '' ? deleteAttribute({ path, value: '=done' })(stateAfterUpdate, transaction) : stateAfterUpdate
}

/** Action-creator for editThought. */
export const editThoughtActionCreator =
  (payload: Parameters<typeof editThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'editThought', ...payload })

export default command(editThought)

// Register this action's metadata
registerActionMetadata('editThought', {
  undoable: true,
  isNavigation: false,
})
