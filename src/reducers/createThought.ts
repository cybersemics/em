import _ from 'lodash'
import updateThoughts from '../reducers/updateThoughts'
import getNextRank from '../selectors/getNextRank'
import getLexeme from '../selectors/getLexeme'
import { getAllChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import createChildrenMap from '../util/createChildrenMap'
import createId from '../util/createId'
import hashThought from '../util/hashThought'
import head from '../util/head'
import timestamp from '../util/timestamp'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Thought from '../@types/Thought'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { getSessionId } from '../util/sessionManager'

interface Payload {
  addAsContext?: boolean
  id?: ThoughtId
  path: Path
  rank: number
  splitSource?: ThoughtId
  value: string
}
/**
 * Creates a new thought with a known context and rank. Does not update the cursor. Use the newThought reducer for a higher level function.
 *
 * @param addAsContext Adds the given context to the new thought.
 */
const createThought = (state: State, { path, value, rank, addAsContext, id, splitSource }: Payload) => {
  // create thought if non-existent
  const lexeme: Lexeme = {
    ...(getLexeme(state, value) || {
      value,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    }),
  }

  id = id || createId()

  // const contextActual = addAsContext ? [value] : context

  // store children indexed by the encoded context for O(1) lookup of children
  // @MIGRATION_NOTE: getThought cannot find paths with context views.
  // const parentId = contextToThoughtId(state, contextActual)
  const parentId = head(path)
  const parent = getThoughtById(state, parentId)

  const thoughtIndexUpdates: Index<Thought> = {}

  if (path.length > 0) {
    // @MIGRATION_NOTE: Context View
    // const newValue = addAsContext ? head(context) : value
    const newValue = value

    const children = getAllChildren(state, parentId)
      .filter(child => child !== id)
      .concat(id)

    const thoughtNew: Thought = {
      id,
      parentId: parentId,
      childrenMap: {},
      lastUpdated: timestamp(),
      rank: addAsContext ? getNextRank(state, id) : rank,
      value: newValue,
      updatedBy: getSessionId(),
      ...(splitSource ? { splitSource } : null),
    }
    thoughtIndexUpdates[id] = thoughtNew

    // insert the new thought into the state just for createChildrenMap
    // otherwise createChildrenMap will not be able to find the new child and thus not properly detect meta attributes which are stored differently
    const stateWithNewThought = {
      ...state,
      thoughts: { ...state.thoughts, thoughtIndex: { ...state.thoughts.thoughtIndex, [id]: thoughtNew } },
    }

    thoughtIndexUpdates[parentId] = {
      ...parent,
      id: parentId,
      childrenMap: createChildrenMap(stateWithNewThought, children),
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    }
  }

  // if adding as the context of an existing thought
  let lexemeNew: Lexeme | undefined // eslint-disable-line fp/no-let
  if (addAsContext) {
    const lexemeOld = getLexeme(state, parent.value)
    lexemeNew = {
      ...lexemeOld!,
      contexts: (lexemeOld?.contexts || []).concat(id),
      created: lexemeOld?.created || timestamp(),
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    }
  } else {
    lexeme.contexts = !lexeme.contexts
      ? []
      : // floating thought (no context)
      path.length > 0
      ? [...lexeme.contexts, id]
      : lexeme.contexts
  }

  const lexemeIndexUpdates = {
    [hashThought(lexeme.value)]: lexeme,
    ...(lexemeNew
      ? {
          [hashThought(lexemeNew.value)]: lexemeNew,
        }
      : null),
  }

  return updateThoughts(state, { lexemeIndexUpdates, thoughtIndexUpdates })
}

export default _.curryRight(createThought)
