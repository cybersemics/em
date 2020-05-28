import render from './render'
import updateThoughts from './updateThoughts'
import { getNextRank, getThought, getThoughts } from '../selectors'

// util
import {
  createUuid,
  equalThoughtRanked,
  hashContext,
  hashThought,
  head,
  timestamp,
} from '../util'

/**
 * Creates a new thought in the given context.
 *
 * @param addAsContext Adds the given context to the new thought.
 */
export default (state, { context, value, rank, addAsContext }) => {

  // create thought if non-existent
  const thought = Object.assign({}, getThought(state, value) || {
    value,
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp()
  })

  const uuid = createUuid()

  // store children indexed by the encoded context for O(1) lookup of children
  const contextEncoded = hashContext(addAsContext ? [value] : context)
  const contextIndexUpdates = {}

  if (context.length > 0) {
    const newContextSubthought = {
      value: addAsContext ? head(context) : value,
      rank: addAsContext ? getNextRank(state, [{ value, rank }]) : rank,
      created: timestamp(),
      uuid,
      lastUpdated: timestamp()
    }
    const children = getThoughts(state, addAsContext ? [value] : context)
      .filter(child => !equalThoughtRanked(child, newContextSubthought))
      .concat(newContextSubthought)
    contextIndexUpdates[contextEncoded] = {
      ...contextIndexUpdates[contextEncoded],
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
        uuid,
        rank: getNextRank(state, [{ value, rank }])
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
        uuid,
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

  return render(
    updateThoughts(state, { thoughtIndexUpdates, contextIndexUpdates })
  )
}
