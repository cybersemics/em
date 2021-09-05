import _ from 'lodash'
// import { treeChange } from '../util/recentlyEditedTree'
import { getLexeme, getAllChildren } from '../selectors'
import updateThoughts from './updateThoughts'
import { Context, Lexeme, SimplePath, State, Timestamp } from '../@types'

// util
import { addContext, hashThought, headId, isDivider, removeContext, timestamp } from '../util'
import { getSessionId } from '../util/sessionManager'

export interface editThoughtPayload {
  oldValue: string
  newValue: string
  context: Context
  showContexts?: boolean
  path: SimplePath
  rankInContext?: number
}

/** Changes the text of an existing thought. */
const editThought = (
  state: State,
  { oldValue, newValue, context, showContexts, path, rankInContext }: editThoughtPayload,
) => {
  if (oldValue === newValue || isDivider(oldValue)) return state

  // thoughts may exist for both the old value and the new value
  const thoughtIndex = { ...state.thoughts.thoughtIndex }
  const editedThoughtId = headId(path)
  const oldKey = hashThought(oldValue)
  const newKey = hashThought(newValue)
  const lexemeOld = getLexeme(state, oldValue)
  const thoughtCollision = getLexeme(state, newValue)

  const editedThought = state.thoughts.contextIndex[editedThoughtId]

  if (!editedThought) {
    console.error('editThought: Edited thought not found!')
    return state
  }

  // guard against missing lexeme (although this should never happen)
  if (!lexemeOld) {
    console.error(`Lexeme not found: "${oldValue}"`)
    return state
  }

  const parentofEditedThought = state.thoughts.contextIndex[editedThought.parentId]

  if (!parentofEditedThought) {
    console.error('Parent not found')
    return state
  }

  const { rank } = editedThought

  const archived = editedThought.archived

  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  // let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
  try {
    // recentlyEdited = treeChange(state.recentlyEdited, path, newPath)
  } catch (e) {
    console.error('editThought: treeChange immer error')
    console.error(e)
  }

  // hasDescendantOfFloatingContext can be done in O(edges)
  // eslint-disable-next-line jsdoc/require-jsdoc
  const isThoughtOldOrphan = () => !lexemeOld.contexts || lexemeOld.contexts.length < 2

  // the old thought less the context
  const newOldThought = !isThoughtOldOrphan() ? removeContext(state, lexemeOld, editedThoughtId) : null

  // do not add floating thought to context
  const lexemeNewWithoutContext: Lexeme = thoughtCollision || {
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp(),
    updatedBy: getSessionId(),
    value: newValue,
  }

  const lexemeNew =
    lexemeOld.contexts.length > 0
      ? addContext(lexemeNewWithoutContext, rank, editedThoughtId, archived as Timestamp)
      : lexemeNewWithoutContext

  // update local thoughtIndex so that we do not have to wait for firebase
  thoughtIndex[newKey] = lexemeNew

  // do not do anything with old thoughtIndex if hashes match, as the above line already took care of it
  if (oldKey !== newKey) {
    if (newOldThought) {
      thoughtIndex[oldKey] = newOldThought
    } else {
      delete thoughtIndex[oldKey] // eslint-disable-line fp/no-delete
    }
  }

  const thoughtNewSubthoughts = getAllChildren(state, context)
    .filter(child => child !== editedThought.id)
    .concat(editedThoughtId)

  const thoughtIndexUpdates = {
    // if the hashes of oldValue and newValue are equal, lexemeNew takes precedence since it contains the updated thought
    [oldKey]: newOldThought,
    [newKey]: lexemeNew,
  }

  const contextIndexUpdates = {
    [parentofEditedThought.id]: {
      ...parentofEditedThought,
      children: thoughtNewSubthoughts,
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    },
    [editedThought.id]: {
      ...editedThought,
      value: newValue,
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    },
    // ...contextIndexDescendantUpdates,
  }

  // preserve contextViews
  // @MIGRATION_TODO: Since same id will be used for context views. Preserving context view may not be required.
  const contextViewsNew = { ...state.contextViews }
  // if (state.contextViews[contextEncodedNew] !== state.contextViews[contextEncodedOld]) {
  //   contextViewsNew[contextEncodedNew] = state.contextViews[contextEncodedOld]
  //   delete contextViewsNew[contextEncodedOld] // eslint-disable-line fp/no-delete
  // }

  // new state
  // do not bump data nonce, otherwise editable will be re-rendered
  const stateNew: State = {
    ...state,
    contextViews: contextViewsNew,
  }

  return updateThoughts(stateNew, {
    thoughtIndexUpdates,
    contextIndexUpdates,
    // recentlyEdited,
  })
}

export default _.curryRight(editThought)
