import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { clientId } from '../data-providers/yjs'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import getSortPreference from '../selectors/getSortPreference'
import getSortedRank from '../selectors/getSortedRank'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToPath from '../selectors/thoughtToPath'
import addContext from '../util/addContext'
import createChildrenMap from '../util/createChildrenMap'
import hashThought from '../util/hashThought'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDivider from '../util/isDivider'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import removeContext from '../util/removeContext'
import timestamp from '../util/timestamp'
import deleteThought from './deleteThought'
import setCursor from './setCursor'
import updateThoughts from './updateThoughts'

export interface editThoughtPayload {
  /** Force the Editable to re-render. */
  // TODO: This is used to force the Editable to re-render on generateThought, which co-opts clearThought during its pending state. Is there a better way to do this?
  force?: boolean
  oldValue: string
  newValue: string
  path: SimplePath
  rankInContext?: number
}

/** Changes the text of an existing thought. */
const editThought = (state: State, { force, oldValue, newValue, path, rankInContext }: editThoughtPayload) => {
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
  const newOldLexeme = lexemeOld && !isThoughtOldOrphan() ? removeContext(state, lexemeOld, editedThoughtId) : null

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

  const thoughtNew: Thought = {
    ...editedThought,
    generating: false,
    rank:
      newValue !== '' && getSortPreference(state, editedThought.parentId).type === 'Alphabetical'
        ? getSortedRank(state, editedThought.parentId, newValue)
        : editedThought.rank,
    value: newValue,
    // store the last non-empty value to preserve the sort order of thoughts edited to empty
    // reset to undefined when newValue is non-empty
    ...(newValue ? undefined : { sortValue: oldValue || editedThought.sortValue }),
    lastUpdated: timestamp(),
    updatedBy: clientId,
  }

  // insert the new thought into the state just for createChildrenMap
  // otherwise createChildrenMap will not be able to find the new child and thus not properly detect meta attributes which are stored differently
  const stateWithNewThought = {
    ...state,
    thoughts: { ...state.thoughts, thoughtIndex: { ...state.thoughts.thoughtIndex, [editedThought.id]: thoughtNew } },
  }

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
  }

  return updateThoughts(stateNew, {
    lexemeIndexUpdates,
    thoughtIndexUpdates,
    // recentlyEdited,
  })
}

/** Action-creator for editThought. */
export const editThoughtActionCreator =
  (payload: Parameters<typeof editThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'editThought', ...payload })

export default _.curryRight(editThought)
