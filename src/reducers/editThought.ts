import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Timestamp from '../@types/Timestamp'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren } from '../selectors/getChildren'
// import { treeChange } from '../util/recentlyEditedTree'
import getLexeme from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToPath from '../selectors/thoughtToPath'
import addContext from '../util/addContext'
import createChildrenMap from '../util/createChildrenMap'
import hashThought from '../util/hashThought'
import head from '../util/head'
import headId from '../util/headId'
import isAttribute from '../util/isAttribute'
import isDivider from '../util/isDivider'
import normalizeThought from '../util/normalizeThought'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import removeContext from '../util/removeContext'
import { getSessionId } from '../util/sessionManager'
import timestamp from '../util/timestamp'
import deleteThought from './deleteThought'
import setCursor from './setCursor'
import updateThoughts from './updateThoughts'

export interface editThoughtPayload {
  oldValue: string
  newValue: string
  path: SimplePath
  rankInContext?: number
}

/** Changes the text of an existing thought. */
const editThought = (state: State, { oldValue, newValue, path, rankInContext }: editThoughtPayload) => {
  if (oldValue === newValue || isDivider(oldValue)) return state

  // thoughts may exist for both the old value and the new value
  const lexemeIndex = { ...state.thoughts.lexemeIndex }
  const editedThoughtId = headId(path)
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

  const { rank } = editedThought

  const archived = editedThought.archived

  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  // let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
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
    updatedBy: getSessionId(),
    lemma: normalizeThought(newValue),
  }

  // the old thought less the context
  const newOldLexeme = lexemeOld && !isThoughtOldOrphan() ? removeContext(state, lexemeOld, editedThoughtId) : null

  const lexemeNew =
    lexemeOld && lexemeOld.contexts.length > 0
      ? addContext(lexemeNewWithoutContext, rank, editedThoughtId, archived as Timestamp)
      : lexemeNewWithoutContext

  // update local lexemeIndex so that we do not have to wait for firebase
  lexemeIndex[newKey] = lexemeNew

  // do not do anything with old lexemeIndex if hashes match, as the above line already took care of it
  if (oldKey !== newKey) {
    if (newOldLexeme) {
      lexemeIndex[oldKey] = newOldLexeme
    } else {
      delete lexemeIndex[oldKey] // eslint-disable-line fp/no-delete
    }
  }

  const lexemeIndexUpdates = {
    // if the hashes of oldValue and newValue are equal, lexemeNew takes precedence since it contains the updated thought
    [oldKey]: newOldLexeme,
    [newKey]: lexemeNew,
  }

  const thoughtNew: Thought = {
    ...editedThought,
    value: newValue,
    // store the last non-empty value to preserve the sort order of thoughts edited to empty
    sortValue: newValue || oldValue || editedThought.sortValue,
    lastUpdated: timestamp(),
    updatedBy: getSessionId(),
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
  //   delete contextViewsNew[contextEncodedOld] // eslint-disable-line fp/no-delete
  // }

  // new state
  const stateNew: State = {
    ...state,
    // clear the clearThought state on edit instead of waiting till blur
    // otherwise activating clearThought after edit will toggle it off
    cursorCleared: false,
    contextViews: contextViewsNew,
  }

  return updateThoughts(stateNew, {
    lexemeIndexUpdates,
    thoughtIndexUpdates,
    // recentlyEdited,
  })
}

export default _.curryRight(editThought)
