// util
import {
  getChildrenWithRank,
  encodeItems,
  equalArrays,
  equalItemRanked,
  equalItemsRanked,
  getThought,
  hashThought,
  moveItem,
  reduceObj,
  removeContext,
  rootedIntersections,
  signifier,
  sigRank,
  sync,
  timestamp,
  unrank,
  unroot,
  updateUrlHistory,
} from '../util.js'

// side effect: sync
export const existingItemMove = (state, { oldItemsRanked, newItemsRanked }) => {

  const data = Object.assign({}, state.data)
  const oldItems = unrank(oldItemsRanked)
  const newItems = unrank(newItemsRanked)
  const value = signifier(oldItems)
  const oldRank = sigRank(oldItemsRanked)
  const newRank = sigRank(newItemsRanked)
  const oldContext = rootedIntersections(oldItems)
  const newContext = rootedIntersections(newItems)
  const sameContext = equalArrays(oldContext, newContext)
  const oldItem = getThought(value, data)
  const newItem = moveItem(oldItem, oldContext, newContext, oldRank, newRank)
  const editing = equalItemsRanked(state.cursorBeforeEdit, oldItemsRanked)

  // preserve contextChildren
  const contextEncodedOld = encodeItems(oldContext)
  const contextNewEncoded = encodeItems(newContext)

  // if the contexts have changed, remove the value from the old contextChildren and add it to the new
  const itemChildrenOld = (state.contextChildren[contextEncodedOld] || [])
    .filter(child => !equalItemRanked(child, { key: value, rank: oldRank }))
  const itemChildrenNew = (state.contextChildren[contextNewEncoded] || [])
    .filter(child => !equalItemRanked(child, { key: value, rank: oldRank }))
    .concat({
      key: value,
      rank: newRank,
      lastUpdated: timestamp()
    })

  const recursiveUpdates = (itemsRanked, inheritance = []) => {

    return getChildrenWithRank(itemsRanked, state.data, state.contextChildren).reduce((accum, child) => {
      const childItem = getThought(child.key, state.data)

      // remove and add the new context of the child
      const childNew = removeContext(childItem, unrank(itemsRanked), child.rank)
      childNew.memberOf.push({ // eslint-disable-line fp/no-mutating-methods
        context: newItems.concat(inheritance),
        rank: child.rank
      })

      // update local data so that we do not have to wait for firebase
      data[hashThought(child.key)] = childNew

      return Object.assign({}, accum,
        {
          [hashThought(child.key)]: {
            key: child.key,
            data: childNew,
            context: unrank(itemsRanked),
            rank: child.rank
          }
        },
        recursiveUpdates(itemsRanked.concat(child), inheritance.concat(child.key))
      )
    }, {})
  }

  const descendantUpdatesResult = recursiveUpdates(oldItemsRanked)
  const descendantUpdates = reduceObj(descendantUpdatesResult, (key, value) => ({
      [key]: value.data
  }))

  const contextChildrenDescendantUpdates = sameContext
    ? {}
    : Object.keys(descendantUpdatesResult).reduce((accum, hashedKey) => {
      const contextEncodedOld = encodeItems(descendantUpdatesResult[hashedKey].context)
      const contextNewEncoded = encodeItems(newItems.concat(descendantUpdatesResult[hashedKey].context.slice(newItems.length + unroot(oldContext).length - unroot(newContext).length)))

      return Object.assign({}, accum, {
        [contextEncodedOld]: (accum[contextEncodedOld] || state.contextChildren[contextEncodedOld] || [])
          .filter(child => child.key !== descendantUpdatesResult[hashedKey].key),
        [contextNewEncoded]: (accum[contextNewEncoded] || state.contextChildren[contextNewEncoded] || [])
          .concat({
            key: descendantUpdatesResult[hashedKey].key,
            rank: descendantUpdatesResult[hashedKey].rank,
            lastUpdated: timestamp()
          })
      })
    }, {})

  const contextChildrenUpdates = Object.assign({
    [contextEncodedOld]: itemChildrenOld,
    [contextNewEncoded]: itemChildrenNew,
  }, contextChildrenDescendantUpdates)
  const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

  Object.keys(newContextChildren).forEach(contextEncoded => {
    const itemChildren = newContextChildren[contextEncoded]
    if (!itemChildren || itemChildren.length === 0) {
      delete newContextChildren[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  const dataUpdates = Object.assign(
    {
      [hashThought(value)]: newItem
    },
    descendantUpdates
  )

  data[hashThought(value)] = newItem

  setTimeout(() => {
    // do not sync to state since this reducer returns the new state
    sync(dataUpdates, contextChildrenUpdates, { state: false })

    if (editing) {
      updateUrlHistory(newItemsRanked, { replace: true })
    }
  })

  return {
    data,
    dataNonce: state.dataNonce + 1,
    cursor: editing ? newItemsRanked : state.cursor,
    cursorBeforeEdit: editing ? newItemsRanked : state.cursorBeforeEdit,
    contextChildren: newContextChildren
  }
}
