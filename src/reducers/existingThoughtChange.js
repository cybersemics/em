// util
import {
  addContext,
  getChildrenWithRank,
  hashContext,
  equalThoughtRanked,
  expandThoughts,
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
export const existingThoughtChange = (state, { oldValue, newValue, context, showContexts, thoughtsRanked, rankInContext, contextChain }) => {

  if (oldValue === newValue) {
    return
  }

  // thoughts may exist for both the old value and the new value
  const thoughtIndex = Object.assign({}, state.thoughtIndex)
  const key = headKey(thoughtsRanked)
  const rank = headRank(thoughtsRanked)
  const thoughtOld = getThought(oldValue, state.thoughtIndex)
  const thoughtCollision = getThought(newValue, state.thoughtIndex)
  const thoughtParentOld = getThought(key, state.thoughtIndex)
  const thoughtsOld = unroot(context).concat(oldValue)
  const thoughtsNew = unroot(context).concat(newValue)
  const thoughtsRankedLiveOld = showContexts
    ? contextOf(contextOf(thoughtsRanked)).concat({ key: oldValue, rank: headRank(contextOf(thoughtsRanked)) }).concat(head(thoughtsRanked))
    : contextOf(thoughtsRanked).concat({ key: oldValue, rank })

  const cursorNew = state.cursor.map(thought => thought.key === oldValue && thought.rank === rankInContext
    ? { key: newValue, rank: thought.rank }
    : thought
  )

  // hasDescendantOfFloatingContext can be done in O(edges)
  const isThoughtOldOrphan = () => !thoughtOld.memberOf || thoughtOld.memberOf.length < 2
  const isThoughtOldChildless = () => getChildrenWithRank([{ key: oldValue, rank }], state.thoughtIndex, state.contextIndex).length < 2

  // the old thought less the context
  const newOldThought = !isThoughtOldOrphan() || (showContexts && !isThoughtOldChildless())
    ? removeContext(thoughtOld, context, rank)
    : null

  // do not add floating thought to context
  const newThoughtWithoutContext = thoughtCollision || {
    value: newValue,
    memberOf: [],
    created: timestamp(),
    lastUpdated: timestamp()
  }
  const thoughtNew = thoughtOld.memberOf.length > 0
    ? addContext(newThoughtWithoutContext, context, showContexts ? headRank(rootedContextOf(thoughtsRankedLiveOld)) : rank)
    : newThoughtWithoutContext

  // update local thoughtIndex so that we do not have to wait for firebase
  thoughtIndex[hashThought(newValue)] = thoughtNew

  // do not do anything with old thoughtIndex if hashes match, as the above line already took care of it
  if (hashThought(oldValue) !== hashThought(newValue)) {
    if (newOldThought) {
      thoughtIndex[hashThought(oldValue)] = newOldThought
    }
    else {
      delete thoughtIndex[hashThought(oldValue)] // eslint-disable-line fp/no-delete
    }
  }

  // if context view, change the memberOf of the current thought (which is rendered visually as the parent of the context since are in the context view)
  let thoughtParentNew // eslint-disable-line fp/no-let
  if (showContexts) {

    thoughtParentNew = Object.assign({}, thoughtParentOld, {
      memberOf: removeContext(thoughtParentOld, contextOf(unrank(thoughtsRankedLiveOld)), rank).memberOf.concat({
        context: thoughtsNew,
        rank
      }),
      created: thoughtParentOld.created,
      lastUpdated: timestamp()
    })
    thoughtIndex[hashThought(key)] = thoughtParentNew
  }

  // preserve context view
  const oldEncoded = hashContext(unrank(state.cursor))
  const newEncoded = hashContext(unrank(cursorNew))
  const contextViews = Object.assign({}, state.contextViews)
  if (oldEncoded !== newEncoded) {
    contextViews[newEncoded] = contextViews[oldEncoded]
    delete contextViews[oldEncoded] // eslint-disable-line fp/no-delete
  }

  // preserve contextIndex
  const contextNewEncoded = hashContext(showContexts ? thoughtsNew : context)
  const thoughtNewChildren = (state.contextIndex[contextNewEncoded] || [])
    .filter(child =>
      !equalThoughtRanked(child, { key: oldValue, rank }) &&
      !equalThoughtRanked(child, { key: newValue, rank })
    )
    .concat({
      key: showContexts ? key : newValue,
      rank,
      lastUpdated: timestamp()
    })

  // preserve contextIndex
  const contextOldEncoded = hashContext(showContexts ? thoughtsOld : context)
  const thoughtOldChildren = (state.contextIndex[contextOldEncoded] || [])
    .filter(child => !equalThoughtRanked(child, head(thoughtsRankedLiveOld)))

  const contextParentEncoded = hashContext(rootedContextOf(showContexts
    ? context
    : unrank(thoughtsRankedLiveOld)
  ))

  const thoughtParentChildren = showContexts ? (state.contextIndex[contextParentEncoded] || [])
    .filter(child =>
      (newOldThought || !equalThoughtRanked(child, { key: oldValue, rank: headRank(rootedContextOf(thoughtsRankedLiveOld)) })) &&
      !equalThoughtRanked(child, { key: newValue, rank: headRank(rootedContextOf(thoughtsRankedLiveOld)) })
    )
    // do not add floating thought to context
   .concat(thoughtOld.memberOf.length > 0 ? {
      key: newValue,
      rank: headRank(rootedContextOf(thoughtsRankedLiveOld)),
      lastUpdated: timestamp()
    } : [])
  : null

  // recursive function to change thought within the context of all descendants
  // contextRecursive is the list of additional ancestors built up in recursive calls that must be concatenated to thoughtsNew to get the proper context
  const recursiveUpdates = (thoughtsRanked, contextRecursive = [], accumRecursive = {}) => {

    return getChildrenWithRank(thoughtsRanked, state.thoughtIndex, state.contextIndex).reduce((accum, child) => {

      const hashedKey = hashThought(child.key)
      const childThought = getThought(child.key, thoughtIndex)

      // this should only happen if there is a thoughtIndex integrity violation
      if (!childThought) {
        // console.error(`Missing child ${child.key} in ${unrank(thoughtsRanked)}`)
        const accumNew = {
          ...accumRecursive,
          ...accum,
        }
        return {
          ...recursiveUpdates(thoughtsRanked.concat(child), contextRecursive.concat(child.key), accumNew)
        }
      }

      // remove and add the new context of the child
      const contextNew = thoughtsNew.concat(showContexts ? key : []).concat(contextRecursive)
      const childNew = addContext(removeContext(childThought, unrank(thoughtsRanked), child.rank), contextNew, child.rank)

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
          context: unrank(thoughtsRanked),
          // return parallel lists so that the old contextIndex can be deleted and new contextIndex can be added
          // TODO: This could be improved by putting it directly into the form required by contextIndex to avoid later merging
          contextsOld: ((accumRecursive[hashedKey] || {}).contextsOld || []).concat([unrank(thoughtsRanked)]),
          contextsNew: ((accumRecursive[hashedKey] || {}).contextsNew || []).concat([contextNew])
        }
      }

      // merge all updates and pass them on to the recursive call
      return {
        ...accumNew,
        ...recursiveUpdates(thoughtsRanked.concat(child), contextRecursive.concat(child.key), accumNew)
      }
    }, {})
  }

  const descendantUpdatesResult = recursiveUpdates(thoughtsRankedLiveOld)
  const descendantUpdates = reduceObj(descendantUpdatesResult, (key, value) => ({
    [key]: value.thoughtIndex
  }))

  const contextIndexDescendantUpdates = reduceObj(descendantUpdatesResult, (key, result) => {
    return result.contextsOld.reduce((accum, contextOld, i) => {
      const contextNew = result.contextsNew[i]
      const contextOldEncoded = hashContext(contextOld)
      const contextNewEncoded = hashContext(contextNew)
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
      // if the hashes of oldValue and newValue are equal, thoughtNew takes precedence since it contains the updated thought
      [hashThought(oldValue)]: newOldThought,
      [hashThought(newValue)]: thoughtNew
    },
    descendantUpdates
  )

  const contextIndexUpdates = Object.assign(
    {
      [contextNewEncoded]: thoughtNewChildren
    },
    showContexts ? {
      [contextOldEncoded]: thoughtOldChildren,
      [contextParentEncoded]: thoughtParentChildren
    } : null,
    contextIndexDescendantUpdates
  )

  const newcontextIndex = Object.assign({}, state.contextIndex, contextIndexUpdates)

  // delete empty contextIndex
  Object.keys(contextIndexUpdates).forEach(contextEncoded => {
    const thoughtNewChildren = contextIndexUpdates[contextEncoded]
    if (!thoughtNewChildren || thoughtNewChildren.length === 0) {
      delete newcontextIndex[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  const newContextViews = state.contextViews[hashContext(thoughtsNew)] !== state.contextViews[hashContext(thoughtsOld)]
    ? Object.assign({}, state.contextViews, {
      [hashContext(thoughtsNew)]: state.contextViews[hashContext(thoughtsOld)]
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
    // do not update cursorBeforeUpdate as that serves as the transcendental head to identify the thought being edited
    cursor: cursorNew,
    expanded: expandThoughts(cursorNew, thoughtIndex, newcontextIndex, newContextViews, contextChain),
    // copy context view to new value
    contextViews: newContextViews,
    contextIndex: newcontextIndex
  }
}
