import render from './render'

// constants
import {
  RENDER_DELAY,
} from '../constants'

// util
import {
  equalThoughtRanked,
  expandThoughts,
  getNextRank,
  getThought,
  hashContext,
  hashThought,
  head,
  notNull,
  sync,
  timestamp,
} from '../util'

// SIDE EFFECTS: sync
// addAsContext adds the given context to the new thought
export default (state, { context, value, rank, addAsContext }) => {

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

  if (context.length > 0) {
    const newContextSubthought = Object.assign({
      value: addAsContext ? head(context) : value,
      rank: addAsContext ? getNextRank([{ value, rank }], state.thoughtIndex, state.contextIndex) : rank,
      created: timestamp(),
      lastUpdated: timestamp()
    })
    const subthoughts = (state.contextIndex[contextEncoded] || [])
      .filter(child => !equalThoughtRanked(child, newContextSubthought))
      .concat(newContextSubthought)
    contextIndexUpdates[contextEncoded] = subthoughts
  }

  // if adding as the context of an existing thought
  let subthoughtNew // eslint-disable-line fp/no-let
  if (addAsContext) {
    const subthoughtOld = getThought(head(context), state.thoughtIndex)
    subthoughtNew = Object.assign({}, subthoughtOld, {
      contexts: subthoughtOld.contexts.concat({
        context: [value],
        rank: getNextRank([{ value, rank }], state.thoughtIndex, state.contextIndex)
      }),
      created: subthoughtOld.created,
      lastUpdated: timestamp()
    })

    setTimeout(() => {
      sync({
        [hashThought(subthoughtNew.value)]: subthoughtNew
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

  const thoughtIndexNew = {
    ...state.thoughtIndex,
    [hashThought(value)]: thought,
    ...(subthoughtNew
      ? {
        [hashThought(subthoughtNew.value)]: subthoughtNew
      }
      : null)
  }

  const contextIndexNew = {
    ...state.contextIndex,
    ...contextIndexUpdates
  }

  return {
    thoughtIndex: thoughtIndexNew,
    contextIndex: contextIndexNew,
    ...render(state),
    expanded: expandThoughts(state.cursor, thoughtIndexNew, contextIndexNew, state.contextViews),
  }
}
