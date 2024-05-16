import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import updateThoughts from '../actions/updateThoughts'
import { clientId } from '../data-providers/yjs'
import getLexeme from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import { childrenMapKey } from '../util/createChildrenMap'
import createId from '../util/createId'
import hashThought from '../util/hashThought'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'
import timestamp from '../util/timestamp'

interface Payload {
  // directly adds children to thought.childrenMap with no additional validation
  children?: ThoughtId[]
  id?: ThoughtId
  /** Callback for when the updates have been synced with IDB. */
  idbSynced?: () => void
  path: Path
  rank: number
  splitSource?: ThoughtId
  value: string
}
/**
 * Creates a new thought with a known context and rank. Does not update the cursor. Use the newThought reducer for a higher level function.
 */
const createThought = (state: State, { path, value, rank, id, idbSynced, children, splitSource }: Payload) => {
  id = id || createId()
  const lexemeOld = getLexeme(state, value)

  // create Lexeme if it does not exist
  const lexemeNew: Lexeme = {
    ...(lexemeOld || {
      created: timestamp(),
      lastUpdated: timestamp(),
      updatedBy: clientId,
    }),
    contexts: [...(lexemeOld?.contexts || []), ...(path.length > 0 ? [id] : [])],
  }

  const parentId = head(path)
  const parent = getThoughtById(state, parentId)

  if (!parent) {
    console.error({ path, value, rank, id, idbSynced, children, splitSource })
    throw new Error(`createThought: Parent thought with id ${parentId} not found`)
  }

  const thoughtIndexUpdates: Index<Thought> = {}

  const newValue = value

  // TODO: Why is a duplicate id encountered sometimes?
  // const duplicateId = getAllChildren(state, parentId).find(childId => childId === id)
  // if (duplicateId) {
  //   throw new Error(`Parent ${parent.value} (${parentId}) already contains thought ${duplicateId}`)
  // }

  const thoughtNew: Thought = {
    // Do not use createChildrenMap since the thoughts must exist and createThought does not require the thoughts to exist.
    childrenMap: children ? keyValueBy(children || {}, id => ({ [id]: id })) : {},
    created: timestamp(),
    id,
    lastUpdated: timestamp(),
    parentId: parentId,
    rank,
    updatedBy: clientId,
    value: newValue,
    ...(splitSource ? { splitSource } : null),
  }

  thoughtIndexUpdates[id] = thoughtNew
  thoughtIndexUpdates[parentId] = {
    ...parent,
    id: parentId,
    childrenMap: {
      // Use this opportunity to delete any children that are missing.
      // This was done for the missing children that are created by multiple refreshes during a large import.
      // If any abberant behavior is observed, try reverting to the previous implementation in importFiles.
      ...keyValueBy(parent.childrenMap, (key, childId) => {
        const child = getThoughtById(state, childId)
        if (!child) {
          console.warn(`Sibling ${childId} with missing thought found while creating new thought ${value} (${id})`)
        }
        return child ? { [key]: childId } : null
      }),
      [childrenMapKey(parent.childrenMap, thoughtNew)]: id,
    },
    lastUpdated: timestamp(),
    updatedBy: clientId,
  }

  const lexemeIndexUpdates = {
    [hashThought(value)]: lexemeNew,
  }

  return updateThoughts(state, { lexemeIndexUpdates, thoughtIndexUpdates, idbSynced })
}

/** Action-creator for createThought. */
export const createThoughtActionCreator =
  (payload: Parameters<typeof createThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'createThought', ...payload })

export default _.curryRight(createThought)
