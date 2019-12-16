// constants
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  hashContext,
  equalThoughtRanked,
  getNextRank,
  getThought,
  hashThought,
  notNull,
  head,
  sync,
  timestamp,
} from '../util.js'

// SIDE EFFECTS: sync
// addAsContext adds the given context to the new thought
export const newThoughtSubmit = (state, { value, context, addAsContext, rank }) => {

  // create thought if non-existent
  const thought = Object.assign({}, getThought(value, state.thoughtIndex) || {
      value,
      contexts: [],
      created: timestamp()
    }, notNull({
      lastUpdated: timestamp()
    })
  )

  // store children indexed by the encoded context for O(1) lookup of children
  const contextEncoded = hashContext(addAsContext ? [value] : context)
  const contextIndexUpdates = {}
  const newcontextIndex = Object.assign({}, state.contextIndex, contextIndexUpdates)

  if (context.length > 0) {
    const newContextChild = Object.assign({
      value: addAsContext ? head(context) : value,
      rank: addAsContext ? getNextRank([{ value, rank }], state.thoughtIndex, state.contextIndex) : rank,
      created: timestamp(),
      lastUpdated: timestamp()
    })
    const thoughtChildren = (state.contextIndex[contextEncoded] || [])
      .filter(child => !equalThoughtRanked(child, newContextChild))
      .concat(newContextChild)
    contextIndexUpdates[contextEncoded] = thoughtChildren
  }

  // if adding as the context of an existing thought
  let thoughtChildNew // eslint-disable-line fp/no-let
  if (addAsContext) {
    const thoughtChildOld = getThought(head(context), state.thoughtIndex)
    thoughtChildNew = Object.assign({}, thoughtChildOld, {
      contexts: thoughtChildOld.contexts.concat({
        context: [value],
        rank: getNextRank([{ value, rank }], state.thoughtIndex, state.contextIndex)
      }),
      created: thoughtChildOld.created,
      lastUpdated: timestamp()
    })

    setTimeout(() => {
      sync({
        [hashThought(thoughtChildNew.value)]: thoughtChildNew
      })
    }, RENDER_DELAY)
  }
  else {
    if (!thought.contexts) {
      thought.contexts = []
    }
    // floating thought (no context)
    if (context.length > 0) {
      thought.contexts.push({ // eslint-disable-line fp/no-mutating-methods
        context,
        rank
      })
    }
  }

  // get around requirement that reducers cannot dispatch actions
  setTimeout(() => {
    sync({
      [hashThought(thought.value)]: thought
    }, contextIndexUpdates)
  }, RENDER_DELAY)

  return {
    thoughtIndex: Object.assign({}, state.thoughtIndex, {
      [hashThought(value)]: thought
    }, thoughtChildNew ? {
      [hashThought(thoughtChildNew.value)]: thoughtChildNew
    } : null),
    dataNonce: state.dataNonce + 1,
    contextIndex: newcontextIndex
  }
}
