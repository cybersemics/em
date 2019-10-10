import { syncOne } from '../store-utils';
import { RENDER_DELAY } from '../constants.js'
import { timestamp, notNull, encodeItems, notFalse, getNextRank, equalItemRanked, signifier } from '../util'

export const newItemSubmit = (state) => ({ value, context, addAsContext, rank, tutorial }) => {

  const animateCharsVisible = tutorial ? 0 : null

  // create item if non-existent
  const item = Object.assign({}, value in state.data && state.data[value]
    ? state.data[value]
    : {
      value: value,
      memberOf: [],
      created: timestamp()
    }, notNull({
      animateCharsVisible,
      tutorial ,
      lastUpdated: timestamp()
    })
  )

  // store children indexed by the encoded context for O(1) lookup of children
  const contextEncoded = encodeItems(addAsContext ? [value] : context)
  let contextChildrenUpdates = {}
  let newContextChildren = state.contextChildren

  if (context.length > 0) {
    const newContextChild = Object.assign({
      key: addAsContext ? signifier(context) : value,
      rank: addAsContext ? getNextRank([{ key: value, rank }], state.data, state.contextChildren): rank,
      created: timestamp(),
      lastUpdated: timestamp()
    }, notNull({ tutorial }))
    const itemChildren = (state.contextChildren[contextEncoded] || [])
      .filter(child => !equalItemRanked(child, newContextChild))
      .concat(newContextChild)
    contextChildrenUpdates = { [contextEncoded]: itemChildren }
    newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)
  }

  // if adding as the context of an existing item
  let itemChildNew
  if (addAsContext) {
    const itemChildOld = state.data[signifier(context)]
    itemChildNew = Object.assign({}, itemChildOld, {
      memberOf: itemChildOld.memberOf.concat({
        context: [value],
        rank: getNextRank([{ key: value, rank }], state.data, state.contextChildren)
      }),
      created: itemChildOld.created,
      lastUpdated: timestamp()
    }, notNull({ animateCharsVisible }), notFalse({ tutorial }))

    setTimeout(() => {
      syncOne(itemChildNew)
    }, RENDER_DELAY)
  }
  else {
    if (!item.memberOf) {
      item.memberOf = []
    }
    // floating thought (no context)
    if (context.length > 0) {
      item.memberOf.push({
        context,
        rank
      })
    }
  }

  // get around requirement that reducers cannot dispatch actions
  setTimeout(() => {
    syncOne(item, contextChildrenUpdates, { localOnly: tutorial })
  }, RENDER_DELAY)

  return {
    data: Object.assign({}, state.data, {
      [value]: item
    }, itemChildNew ? {
      [itemChildNew.value]: itemChildNew
    } : null),
    dataNonce: state.dataNonce + 1,
    contextChildren: newContextChildren
  }
}