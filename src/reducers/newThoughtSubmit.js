// constants
// import {
//   RENDER_DELAY,
// } from '../constants.js'

// util
import {
  hashContext,
  // equalThoughtRanked,
  getNextRank,
  getThought,
  // getThoughts,
  hashThought,
  notNull,
  head,
  sync,
  timestamp,
} from '../util.js'

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
  const contextResolved = addAsContext ? [value] : context
  const contextEncoded = hashContext(contextResolved)
  const contextIndexUpdates = {}

  if (context.length > 0) {

    const valueNew = addAsContext ? head(context) : value
    const rankNew = addAsContext ? getNextRank([{ value, rank }], state.thoughtIndex, state.contextIndex) : rank

    const newContextSubthought = {
      value: valueNew,
      rank: rankNew,
      created: timestamp(),
      lastUpdated: timestamp()
    }

    // key formatted for _.set
    contextIndexUpdates[`${contextEncoded}.thoughts.${hashThought(valueNew, rankNew)}`] = newContextSubthought
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
        rank
      })
    }
  }

  // get around requirement that reducers cannot dispatch actions
  setTimeout(() => {
    sync({
      [hashThought(thought.value)]: thought
    }, contextIndexUpdates, { forceRender: true })
  })

  // const thoughtIndexNew = {
  //   ...state.thoughtIndex,
  //   [hashThought(value)]: thought,
  //   ...(subthoughtNew
  //     ? {
  //       [hashThought(subthoughtNew.value)]: subthoughtNew
  //     }
  //     : null)
  // }

  // const contextIndexNew = {
  //   ...state.contextIndex,
  //   ...contextIndexUpdates
  // }

  return {
    // thoughtIndex: thoughtIndexNew,
    // contextIndex: contextIndexNew,
    // ...render(state),
  }
}
