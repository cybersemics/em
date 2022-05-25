import _ from 'lodash'
import { updateThoughts } from '../reducers'
import { getNextRank, getLexeme, getAllChildren, contextToThought, getThoughtById } from '../selectors'
import { createId, hashThought, head, timestamp } from '../util'
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
  const thought = contextToThought(state, contextActual)

  if (!thought) return state

  const thoughtIndexUpdates: Index<Thought> = {}

  if (context.length > 0) {
    const newValue = addAsContext ? head(context) : value

    const children = getAllChildren(state, contextActual)
      .filter(child => child !== id)
      .concat(id)

    thoughtIndexUpdates[thought.id] = {
      ...getThoughtById(state, thought.id),
      id: thought.id,
      children,
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    }

    thoughtIndexUpdates[id] = {
      id,
      parentId: thought.id,
      children: [],
      lastUpdated: timestamp(),
      rank: addAsContext ? getNextRank(state, id) : rank,
      value: newValue,
      updatedBy: getSessionId(),
      splitSource,
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
