import _ from 'lodash'
import { updateThoughts } from '../reducers'
import { getNextRank, getThought, getThoughts } from '../selectors'
import { createId, equalThoughtRanked, hashContext, hashThought, head, timestamp } from '../util'
import { State } from '../util/initialState'
import { Context, Index, Parent } from '../types'

/**
 * Creates a new thought in the given context.
 *
 * @param addAsContext Adds the given context to the new thought.
 */
const newThoughtSubmit = (state: State, { context, value, rank, addAsContext }: { context: Context, value: string, rank: number, addAsContext?: boolean }) => {

  // create thought if non-existent
  const thought = Object.assign({}, getThought(state, value) || {
    value,
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp()
  })

  const id = createId()
  const contextActual = addAsContext ? [value] : context

  // store children indexed by the encoded context for O(1) lookup of children
  const contextEncoded = hashContext(contextActual)
  const contextIndexUpdates: Index<Parent> = {}

  if (context.length > 0) {
    const newContextSubthought = {
      value: addAsContext ? head(context) : value,
      rank: addAsContext ? getNextRank(state, [value]) : rank,
      created: timestamp(),
      id,
      lastUpdated: timestamp()
    }
    const children = getThoughts(state, contextActual)
      .filter(child => !equalThoughtRanked(child, newContextSubthought))
      .concat(newContextSubthought)
    contextIndexUpdates[contextEncoded] = {
      ...contextIndexUpdates[contextEncoded],
      context: contextActual,
      children,
      lastUpdated: timestamp()
    }
  }

  // if adding as the context of an existing thought
  let subthoughtNew // eslint-disable-line fp/no-let
  if (addAsContext) {
    const subthoughtOld = getThought(state, head(context))
    subthoughtNew = Object.assign({}, subthoughtOld, {
      contexts: subthoughtOld.contexts.concat({
        context: [value],
        id,
        rank: getNextRank(state, [value])
      }),
      created: subthoughtOld.created || timestamp(),
      lastUpdated: timestamp()
    })
  }
  else {
    if (!thought.contexts) {
      thought.contexts = []
    }
    // floating thought (no context)
    if (context.length > 0) {
      thought.contexts.push({ // eslint-disable-line fp/no-mutating-methods
        context,
        id,
        rank
      })
    }
  }

  const thoughtIndexUpdates = {
    [hashThought(thought.value)]: thought,
    ...subthoughtNew
      ? {
        [hashThought(subthoughtNew.value)]: subthoughtNew
      }
      : null
  }

  return updateThoughts(state, { thoughtIndexUpdates, contextIndexUpdates })
}

export default _.curryRight(newThoughtSubmit)
