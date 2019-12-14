// util
import {
  addContext,
  getChildrenWithRank,
  encodeItems,
  equalItemRanked,
  expandItems,
  getThought,
  hashThought,
  contextOf,
  reduceObj,
  removeContext,
  rootedContextOf,
  head,
  headKey,
  headRank,
  sync,
  timestamp,
  unrank,
  unroot,
  updateUrlHistory,
} from '../util.js'

// SIDE EFFECTS: sync, updateUrlHistory
export const existingItemChange = (state, { oldValue, newValue, context, showContexts, itemsRanked, rankInContext, contextChain }) => {

  if (oldValue === newValue) {
    return
  }

  // items may exist for both the old value and the new value
  const thoughtIndex = Object.assign({}, state.thoughtIndex)
  const key = headKey(itemsRanked)
  const rank = headRank(itemsRanked)
  const itemOld = getThought(oldValue, state.thoughtIndex)
  const itemCollision = getThought(newValue, state.thoughtIndex)
  const itemParentOld = getThought(key, state.thoughtIndex)
  const itemsOld = unroot(context).concat(oldValue)
  const itemsNew = unroot(context).concat(newValue)
  const itemsRankedLiveOld = showContexts
    ? contextOf(contextOf(itemsRanked)).concat({ key: oldValue, rank: headRank(contextOf(itemsRanked)) }).concat(head(itemsRanked))
    : contextOf(itemsRanked).concat({ key: oldValue, rank })

  const cursorNew = state.cursor.map(item => item.key === oldValue && item.rank === rankInContext
    ? { key: newValue, rank: item.rank }
    : item
  )

  // hasDescendantOfFloatingContext can be done in O(edges)
  const isItemOldOrphan = () => !itemOld.memberOf || itemOld.memberOf.length < 2
  const isItemOldChildless = () => getChildrenWithRank([{ key: oldValue, rank }], state.thoughtIndex, state.contextIndex).length < 2

  // the old item less the context
  const newOldItem = !isItemOldOrphan() || (showContexts && !isItemOldChildless())
    ? removeContext(itemOld, context, rank)
    : null

  // do not add floating item to context
  const newItemWithoutContext = itemCollision || {
    value: newValue,
    memberOf: [],
    created: timestamp(),
    lastUpdated: timestamp()
  }
  const itemNew = itemOld.memberOf.length > 0
    ? addContext(newItemWithoutContext, context, showContexts ? headRank(rootedContextOf(itemsRankedLiveOld)) : rank)
    : newItemWithoutContext

  // update local thoughtIndex so that we do not have to wait for firebase
  thoughtIndex[hashThought(newValue)] = itemNew

  // do not do anything with old thoughtIndex if hashes match, as the above line already took care of it
  if (hashThought(oldValue) !== hashThought(newValue)) {
    if (newOldItem) {
      thoughtIndex[hashThought(oldValue)] = newOldItem
    }
    else {
      delete thoughtIndex[hashThought(oldValue)] // eslint-disable-line fp/no-delete
    }
  }

  // if context view, change the memberOf of the current thought (which is rendered visually as the parent of the context since are in the context view)
  let itemParentNew // eslint-disable-line fp/no-let
  if (showContexts) {

    itemParentNew = Object.assign({}, itemParentOld, {
      memberOf: removeContext(itemParentOld, contextOf(unrank(itemsRankedLiveOld)), rank).memberOf.concat({
        context: itemsNew,
        rank
      }),
      created: itemParentOld.created,
      lastUpdated: timestamp()
    })
    thoughtIndex[hashThought(key)] = itemParentNew
  }

  // preserve context view
  const oldEncoded = encodeItems(unrank(state.cursor))
  const newEncoded = encodeItems(unrank(cursorNew))
  const contextViews = Object.assign({}, state.contextViews)
  if (oldEncoded !== newEncoded) {
    contextViews[newEncoded] = contextViews[oldEncoded]
    delete contextViews[oldEncoded] // eslint-disable-line fp/no-delete
  }

  // preserve contextIndex
  const contextNewEncoded = encodeItems(showContexts ? itemsNew : context)
  const itemNewChildren = (state.contextIndex[contextNewEncoded] || [])
    .filter(child =>
      !equalItemRanked(child, { key: oldValue, rank }) &&
      !equalItemRanked(child, { key: newValue, rank })
    )
    .concat({
      key: showContexts ? key : newValue,
      rank,
      lastUpdated: timestamp()
    })

  // preserve contextIndex
  const contextOldEncoded = encodeItems(showContexts ? itemsOld : context)
  const itemOldChildren = (state.contextIndex[contextOldEncoded] || [])
    .filter(child => !equalItemRanked(child, head(itemsRankedLiveOld)))

  const contextParentEncoded = encodeItems(rootedContextOf(showContexts
    ? context
    : unrank(itemsRankedLiveOld)
  ))

  const itemParentChildren = showContexts ? (state.contextIndex[contextParentEncoded] || [])
    .filter(child =>
      (newOldItem || !equalItemRanked(child, { key: oldValue, rank: headRank(rootedContextOf(itemsRankedLiveOld)) })) &&
      !equalItemRanked(child, { key: newValue, rank: headRank(rootedContextOf(itemsRankedLiveOld)) })
    )
    // do not add floating item to context
   .concat(itemOld.memberOf.length > 0 ? {
      key: newValue,
      rank: headRank(rootedContextOf(itemsRankedLiveOld)),
      lastUpdated: timestamp()
    } : [])
  : null

  // recursive function to change item within the context of all descendants
  // contextRecursive is the list of additional ancestors built up in recursive calls that must be concatenated to itemsNew to get the proper context
  const recursiveUpdates = (itemsRanked, contextRecursive = [], accumRecursive = {}) => {

    return getChildrenWithRank(itemsRanked, state.thoughtIndex, state.contextIndex).reduce((accum, child) => {

      const hashedKey = hashThought(child.key)
      const childItem = getThought(child.key, thoughtIndex)

      // this should only happen if there is a thoughtIndex integrity violation
      if (!childItem) {
        // console.error(`Missing child ${child.key} in ${unrank(itemsRanked)}`)
        const accumNew = {
          ...accumRecursive,
          ...accum,
        }
        return {
          ...recursiveUpdates(itemsRanked.concat(child), contextRecursive.concat(child.key), accumNew)
        }
      }

      // remove and add the new context of the child
      const contextNew = itemsNew.concat(showContexts ? key : []).concat(contextRecursive)
      const childNew = addContext(removeContext(childItem, unrank(itemsRanked), child.rank), contextNew, child.rank)

      // update local thoughtIndex so that we do not have to wait for firebase
      thoughtIndex[hashedKey] = childNew

      const accumNew = {
        // merge ancestor updates
        ...accumRecursive,
        // merge sibling updates
        // Order matters: accum must have precendence over accumRecursive so that contextNew is correct
        ...accum,
        // merge current thought updates
        [hashedKey]: {
          thoughtIndex: childNew,
          context: unrank(itemsRanked),
          // return parallel lists so that the old contextIndex can be deleted and new contextIndex can be added
          // TODO: This could be improved by putting it directly into the form required by contextIndex to avoid later merging
          contextsOld: ((accumRecursive[hashedKey] || {}).contextsOld || []).concat([unrank(itemsRanked)]),
          contextsNew: ((accumRecursive[hashedKey] || {}).contextsNew || []).concat([contextNew])
        }
      }

      // merge all updates and pass them on to the recursive call
      return {
        ...accumNew,
        ...recursiveUpdates(itemsRanked.concat(child), contextRecursive.concat(child.key), accumNew)
      }
    }, {})
  }

  const descendantUpdatesResult = recursiveUpdates(itemsRankedLiveOld)
  const descendantUpdates = reduceObj(descendantUpdatesResult, (key, value) => ({
    [key]: value.thoughtIndex
  }))

  const contextIndexDescendantUpdates = reduceObj(descendantUpdatesResult, (key, result) => {
    return result.contextsOld.reduce((accum, contextOld, i) => {
      const contextNew = result.contextsNew[i]
      const contextOldEncoded = encodeItems(contextOld)
      const contextNewEncoded = encodeItems(contextNew)
      return {
        ...accum,
        [contextOldEncoded]: null,
        [contextNewEncoded]: (state.contextIndex[contextOldEncoded] || [])
          .concat(state.contextIndex[contextNewEncoded] || [])
      }
    }, {})
  })

  const thoughtIndexUpdates = Object.assign(
    {
      // if the hashes of oldValue and newValue are equal, itemNew takes precedence since it contains the updated thought
      [hashThought(oldValue)]: newOldItem,
      [hashThought(newValue)]: itemNew
    },
    descendantUpdates
  )

  const contextIndexUpdates = Object.assign(
    {
      [contextNewEncoded]: itemNewChildren
    },
    showContexts ? {
      [contextOldEncoded]: itemOldChildren,
      [contextParentEncoded]: itemParentChildren
    } : null,
    contextIndexDescendantUpdates
  )

  const newcontextIndex = Object.assign({}, state.contextIndex, contextIndexUpdates)

  // delete empty contextIndex
  Object.keys(contextIndexUpdates).forEach(contextEncoded => {
    const itemNewChildren = contextIndexUpdates[contextEncoded]
    if (!itemNewChildren || itemNewChildren.length === 0) {
      delete newcontextIndex[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  const newContextViews = state.contextViews[encodeItems(itemsNew)] !== state.contextViews[encodeItems(itemsOld)]
    ? Object.assign({}, state.contextViews, {
      [encodeItems(itemsNew)]: state.contextViews[encodeItems(itemsOld)]
    })
    : state.contextViews

  setTimeout(() => {
    // do not sync to state since this reducer returns the new state
    sync(thoughtIndexUpdates, contextIndexUpdates, { state: false })

    updateUrlHistory(cursorNew, { thoughtIndex: state.thoughtIndex, contextViews: newContextViews, replace: true })
  })

  return {
    // do not bump thoughtIndex nonce, otherwise editable will be re-rendered
    thoughtIndex,
    // update cursor so that the other contexts superscript and depth-bar will re-render
    // do not update cursorBeforeUpdate as that serves as the transcendental head to identify the item being edited
    cursor: cursorNew,
    expanded: expandItems(cursorNew, thoughtIndex, newcontextIndex, newContextViews, contextChain),
    // copy context view to new value
    contextViews: newContextViews,
    contextIndex: newcontextIndex
  }
}
