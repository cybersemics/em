import _ from 'lodash'
import { updateThoughts } from '../reducers'
import { getNextRank, getLexeme, getAllChildren, contextToThoughtId, getThoughtById } from '../selectors'
import { createChildrenMap, createId, hashThought, head, timestamp } from '../util'
import { Context, Index, Lexeme, Thought, State, ThoughtId } from '../@types'
import { getSessionId } from '../util/sessionManager'

interface Payload {
  context: Context
  value: string
  rank: number
  id?: ThoughtId
  addAsContext?: boolean
  splitSource?: ThoughtId
}
/**
 * Creates a new thought with a known context and rank. Does not update the cursor. Use the newThought reducer for a higher level function.
 *
 * @param addAsContext Adds the given context to the new thought.
 */
const createThought = (state: State, { context, value, rank, addAsContext, id, splitSource }: Payload) => {
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

  const contextActual = addAsContext ? [value] : context

  // store children indexed by the encoded context for O(1) lookup of children
  // @MIGRATION_NOTE: getThought cannot find paths with context views.
  const parentId = contextToThoughtId(state, contextActual)

  if (!parentId) return state

  const thoughtIndexUpdates: Index<Thought> = {}

  if (context.length > 0) {
    const newValue = addAsContext ? head(context) : value

    const children = getAllChildren(state, parentId)
      .filter(child => child !== id)
      .concat(id)

    const thoughtNew = {
      id,
      parentId: parentId,
      children: [],
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

    const parent = getThoughtById(state, parentId)
    thoughtIndexUpdates[parentId] = {
      ...parent,
      id: parentId,
      children,
      childrenMap: createChildrenMap(stateWithNewThought, children),
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    }
  }

  // if adding as the context of an existing thought
  let lexemeNew: Lexeme | undefined // eslint-disable-line fp/no-let
  if (addAsContext) {
    const lexemeOld = getLexeme(state, head(context))
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
      context.length > 0
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
