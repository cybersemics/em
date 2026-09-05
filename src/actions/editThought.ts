import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { clientId } from '../data-providers/thoughtspaceSession'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import getMovePlacement from '../selectors/getMovePlacement'
import getSortPreference from '../selectors/getSortPreference'
import getSortedRank from '../selectors/getSortedRank'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import addContext from '../util/addContext'
import createChildrenMap from '../util/createChildrenMap'
import hashThought from '../util/hashThought'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDivider from '../util/isDivider'
import isEmptyOrEmojiOnly from '../util/isEmptyOrEmojiOnly'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import removeContext from '../util/removeContext'
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
) => {
  if (oldValue === newValue || isDivider(oldValue)) return state

  // thoughts may exist for both the old value and the new value
  const lexemeIndex = { ...state.thoughts.lexemeIndex }
  const editedThoughtId = head(path)
  const oldKey = hashThought(oldValue)
  const newKey = hashThought(newValue)
  const lexemeOld = getLexeme(state, oldValue)
  const thoughtCollision = getLexeme(state, newValue)

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

  // guard against missing Lexeme
  // although this should never happen, syncing issues can cause this
  if (!lexemeOld) {
    console.warn(`Missing Lexeme: ${oldValue}`)
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
    ])(state)
  }

  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  // let recentlyEdited = state.recentlyEdited
  // try {
  //   recentlyEdited = treeChange(state.recentlyEdited, path, newPath)
  // } catch (e) {
  //   console.error('editThought: treeChange immer error')
  //   console.error(e)
  // }

  // hasDescendantOfFloatingContext can be done in O(edges)
  // eslint-disable-next-line jsdoc/require-jsdoc
  const isThoughtOldOrphan = () => lexemeOld && (!lexemeOld.contexts || lexemeOld.contexts.length < 2)

  // do not add floating thought to context
  const lexemeNewWithoutContext: Lexeme = thoughtCollision || {
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp(),
    updatedBy: clientId,
  }

  // the old thought less the context
  const newOldLexeme = lexemeOld && !isThoughtOldOrphan() ? removeContext(lexemeOld, editedThoughtId) : null

  const lexemeNew = addContext(lexemeNewWithoutContext, { id: editedThoughtId, archived: editedThought.archived })

  // update local lexemeIndex so that we do not have to wait for the remote
  lexemeIndex[newKey] = lexemeNew

  // do not do anything with old lexemeIndex if hashes match, as the above line already took care of it
  if (oldKey !== newKey) {
    if (newOldLexeme) {
      lexemeIndex[oldKey] = newOldLexeme
    } else {
      delete lexemeIndex[oldKey]
    }
  }

  const lexemeIndexUpdates = {
    // if the hashes of oldValue and newValue are equal, lexemeNew takes precedence since it contains the updated thought
    [oldKey]: newOldLexeme,
    [newKey]: lexemeNew,
  }
  const isNote = parentOfEditedThought.value === '=note'
  const sortPreference = getSortPreference(state, editedThought.parentId)
  const sortType = sortPreference.type
  const isValueEmptyOrEmojiOnly = isEmptyOrEmojiOnly(newValue)

  const thoughtNew: Thought = {
    ...editedThought,
    ...(editedThought.generating ? { generating: false } : null),
    rank:
      !isValueEmptyOrEmojiOnly && (sortType === 'Alphabetical' || sortType === 'Created' || sortType === 'Updated')
        ? getSortedRank(state, editedThought.parentId, newValue, {
            created: editedThought.created,
            staleId: editedThought.id,
          })
        : editedThought.rank,
    value: newValue,
    lastUpdated: timestamp(),
    updatedBy: clientId,
  }

  // insert the new thought into the state just for createChildrenMap
  // otherwise createChildrenMap will not be able to find the new child and thus not properly detect meta attributes which are stored differently
  const stateWithNewThought = {
    ...state,
    thoughts: { ...state.thoughts, thoughtIndex: { ...state.thoughts.thoughtIndex, [editedThought.id]: thoughtNew } },
  }

  // If we're editing a note, the thought that owns the note is re-ranked, since a Note-sorted context sorts its
  // children by their note value rather than their own.
  const noteParentThought = isNote ? getThoughtById(state, parentOfEditedThought.parentId) : null
  const noteParentThoughtNew =
    noteParentThought && getSortPreference(state, noteParentThought.parentId).type === 'Note'
      ? {
          ...noteParentThought,
          rank: getSortedRank(state, noteParentThought.parentId, newValue),
          lastUpdated: timestamp(),
          updatedBy: clientId,
        }
      : null

  const thoughtIndexUpdates: Index<Thought | null> = {
    ...(isAttribute(newValue)
      ? {
          [parentOfEditedThought.id]: {
            ...parentOfEditedThought,
            childrenMap: createChildrenMap(stateWithNewThought, getAllChildren(state, parentOfEditedThought.id)),
          },
        }
      : null),
    [editedThought.id]: thoughtNew,
    ...(noteParentThoughtNew ? { [noteParentThoughtNew.id]: noteParentThoughtNew } : null),
  }

  // A new rank is invisible to the persistence layer on its own: sibling order is stored structurally there and
  // only changes on a move, which is minted from an explicit placement. Without one the thought keeps the position
  // it had when it was created, so the sorted position it was given here is lost on reload (#5126).
  const movePlacements: Index<ThoughtId | null> = {
    ...(thoughtNew.rank !== editedThought.rank
      ? {
          [editedThought.id]: getMovePlacement(state, editedThought.parentId, {
            id: editedThought.id,
            rank: thoughtNew.rank,
          }),
        }
      : null),
    ...(noteParentThoughtNew && noteParentThoughtNew.rank !== noteParentThought?.rank
      ? {
          [noteParentThoughtNew.id]: getMovePlacement(state, noteParentThoughtNew.parentId, {
            id: noteParentThoughtNew.id,
            rank: noteParentThoughtNew.rank,
          }),
        }
      : null),
  }

  // preserve contextViews
  // @MIGRATION_TODO: Since same id will be used for context views. Preserving context view may not be required.
  const contextViewsNew = { ...state.contextViews }
  // if (state.contextViews[contextEncodedNew] !== state.contextViews[contextEncodedOld]) {
  //   contextViewsNew[contextEncodedNew] = state.contextViews[contextEncodedOld]
  //   delete contextViewsNew[contextEncodedOld]
  // }

  // new state
  const stateNew: State = {
    ...state,
    contextViews: contextViewsNew,
    // clear the clearThought state on edit instead of waiting till blur
    // otherwise activating clearThought after edit will toggle it off
    ...(state.cursorCleared ? { cursorCleared: false } : null),
    ...(force ? { editableNonce: state.editableNonce + 1 } : null),
    ...(noteOffset != null ? { noteOffset } : null),
  }

  const stateAfterUpdate = updateThoughts(stateNew, {
    cursorOffset,
    lexemeIndexUpdates,
    thoughtIndexUpdates,
    ...(Object.keys(movePlacements).length > 0 ? { movePlacements } : null),
    // recentlyEdited,
  })

  // remove =done when thought is edited to empty to prevent strikethrough on the placeholder
  return newValue === '' ? deleteAttribute({ path, value: '=done' })(stateAfterUpdate) : stateAfterUpdate
}

/** Action-creator for editThought. */
export const editThoughtActionCreator =
  (payload: Parameters<typeof editThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'editThought', ...payload })

export default _.curryRight(editThought)

// Register this action's metadata
registerActionMetadata('editThought', {
  undoable: true,
  isNavigation: false,
})
