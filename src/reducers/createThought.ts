import _ from 'lodash'
import { updateThoughts } from '../reducers'
import { getNextRank, getLexeme, getAllChildren, getParent } from '../selectors'
import { createId, equalThoughtRanked, hashContext, hashThought, head, timestamp, unroot } from '../util'
import { Context, Index, Lexeme, Parent, State } from '../@types'

interface Payload {
  context: Context
  value: string
  rank: number
  addAsContext?: boolean
}
/**
 * Creates a new thought with a known context and rank. Does not update the cursor. Use the newThought reducer for a higher level function.
 *
 * @param addAsContext Adds the given context to the new thought.
 */
const createThought = (state: State, { context, value, rank, addAsContext }: Payload) => {
  // create thought if non-existent
  const lexeme: Lexeme = {
    ...(getLexeme(state, value) || {
      value,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp(),
    }),
  }

  const contextActual = addAsContext ? [value] : context

  // store children indexed by the encoded context for O(1) lookup of children
  const contextEncoded = hashContext(contextActual)
  const contextIndexUpdates: Index<Parent> = {}

  if (context.length > 0) {
    const newContextSubthought = {
      value: addAsContext ? head(context) : value,
      rank: addAsContext ? getNextRank(state, [value]) : rank,
      created: timestamp(),
      id: hashContext([...contextActual, value]),
      lastUpdated: timestamp(),
    }
    const children = getAllChildren(state, contextActual)
      .filter(child => !equalThoughtRanked(child, newContextSubthought))
      .concat(newContextSubthought)
    contextIndexUpdates[contextEncoded] = {
      ...contextIndexUpdates[contextEncoded],
      id: getParent(state, contextActual)?.id || createId(),
      children,
      lastUpdated: timestamp(),
    }
  }

  // if adding as the context of an existing thought
  let subthoughtNew // eslint-disable-line fp/no-let
  if (addAsContext) {
    const subthoughtOld = getLexeme(state, head(context))
    subthoughtNew = Object.assign({}, subthoughtOld, {
      contexts: (subthoughtOld?.contexts || []).concat({
        context: [value],
        id: hashContext([value, subthoughtOld?.value || '']),
        rank: getNextRank(state, [value]),
      }),
      created: subthoughtOld?.created || timestamp(),
      lastUpdated: timestamp(),
    })
  } else {
    lexeme.contexts = !lexeme.contexts
      ? []
      : // floating thought (no context)
      context.length > 0
      ? [
          ...lexeme.contexts,
          {
            context,
            id: hashContext(unroot([...context, lexeme.value])),
            rank,
          },
        ]
      : lexeme.contexts
  }

  const thoughtIndexUpdates = {
    [hashThought(lexeme.value)]: lexeme,
    ...(subthoughtNew
      ? {
          [hashThought(subthoughtNew.value)]: subthoughtNew,
        }
      : null),
  }

  return updateThoughts(state, { thoughtIndexUpdates, contextIndexUpdates })
}

export default _.curryRight(createThought)
