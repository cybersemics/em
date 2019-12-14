// constants
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  hashContext,
  equalItemRanked,
  getNextRank,
  getThought,
  hashThought,
  notNull,
  head,
  sync,
  timestamp,
} from '../util.js'

// SIDE EFFECTS: sync
// addAsContext adds the given context to the new item
export const newItemSubmit = (state, { value, context, addAsContext, rank }) => {

  // create item if non-existent
  const item = Object.assign({}, getThought(value, state.thoughtIndex) || {
      value: value,
      memberOf: [],
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
      key: addAsContext ? head(context) : value,
      rank: addAsContext ? getNextRank([{ key: value, rank }], state.thoughtIndex, state.contextIndex) : rank,
      created: timestamp(),
      lastUpdated: timestamp()
    })
    const itemChildren = (state.contextIndex[contextEncoded] || [])
      .filter(child => !equalItemRanked(child, newContextChild))
      .concat(newContextChild)
    contextIndexUpdates[contextEncoded] = itemChildren
  }

  // if adding as the context of an existing item
  let itemChildNew // eslint-disable-line fp/no-let
  if (addAsContext) {
    const itemChildOld = getThought(head(context), state.thoughtIndex)
    itemChildNew = Object.assign({}, itemChildOld, {
      memberOf: itemChildOld.memberOf.concat({
        context: [value],
        rank: getNextRank([{ key: value, rank }], state.thoughtIndex, state.contextIndex)
      }),
      created: itemChildOld.created,
      lastUpdated: timestamp()
    })

    setTimeout(() => {
      sync({
        [hashThought(itemChildNew.value)]: itemChildNew
      })
    }, RENDER_DELAY)
  }
  else {
    if (!item.memberOf) {
      item.memberOf = []
    }
    // floating thought (no context)
    if (context.length > 0) {
      item.memberOf.push({ // eslint-disable-line fp/no-mutating-methods
        context,
        rank
      })
    }
  }

  // get around requirement that reducers cannot dispatch actions
  setTimeout(() => {
    sync({
      [hashThought(item.value)]: item
    }, contextIndexUpdates)
  }, RENDER_DELAY)

  return {
    thoughtIndex: Object.assign({}, state.thoughtIndex, {
      [hashThought(value)]: item
    }, itemChildNew ? {
      [hashThought(itemChildNew.value)]: itemChildNew
    } : null),
    dataNonce: state.dataNonce + 1,
    contextIndex: newcontextIndex
  }
}
