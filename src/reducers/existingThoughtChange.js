import * as localForage from 'localforage'

// util
import {
  addContext,
  getChildrenWithRank,
  hashContext,
  equalThoughtRanked,
  expandThoughts,
  getThought,
  hashContextUrl,
  hashThought,
  contextOf,
  reduceObj,
  removeContext,
  rootedContextOf,
  head,
  headValue,
  headRank,
  sync,
  timestamp,
  pathToContext,
  unroot,
  updateUrlHistory,
} from '../util.js'

// SIDE EFFECTS: sync, updateUrlHistory
export const existingThoughtChange = (state, { oldValue, newValue, context, showContexts, thoughtsRanked, rankInContext, contextChain }) => {

  if (oldValue === newValue) {
    return
  }

  // thoughts may exist for both the old value and the new value
  const thoughtIndex = { ...state.thoughtIndex }
  const value = headValue(thoughtsRanked)
  const rank = headRank(thoughtsRanked)
  const oldKey = hashThought(oldValue)
  const newKey = hashThought(newValue)
  const thoughtOld = getThought(oldValue, state.thoughtIndex)
  const thoughtCollision = getThought(newValue, state.thoughtIndex)
  const thoughtParentOld = getThought(value, state.thoughtIndex)
  const thoughtsOld = unroot(context).concat(oldValue)
  const thoughtsNew = unroot(context).concat(newValue)
  const contextEncodedOld = hashContext(thoughtsOld)
  const contextEncodedNew = hashContext(thoughtsNew)
  const thoughtsRankedLiveOld = showContexts
    ? contextOf(contextOf(thoughtsRanked)).concat({ value: oldValue, rank: headRank(contextOf(thoughtsRanked)) }).concat(head(thoughtsRanked))
    : contextOf(thoughtsRanked).concat({ value: oldValue, rank })

  const cursorNew = state.cursor.map(thought => thought.value === oldValue && thought.rank === rankInContext
    ? { value: newValue, rank: thought.rank }
    : thought
  )

  // hasDescendantOfFloatingContext can be done in O(edges)
  const isThoughtOldOrphan = () => !thoughtOld.contexts || thoughtOld.contexts.length < 2
  const isThoughtOldChildless = () => getChildrenWithRank([{ value: oldValue, rank }], state.thoughtIndex, state.contextIndex).length < 2

  // the old thought less the context
  const newOldThought = !isThoughtOldOrphan() || (showContexts && !isThoughtOldChildless())
    ? removeContext(thoughtOld, context, rank)
    : null

  // do not add floating thought to context
  const newThoughtWithoutContext = thoughtCollision || {
    value: newValue,
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp()
  }
  const thoughtNew = thoughtOld.contexts.length > 0
    ? addContext(newThoughtWithoutContext, context, showContexts ? headRank(rootedContextOf(thoughtsRankedLiveOld)) : rank)
    : newThoughtWithoutContext

  // update local thoughtIndex so that we do not have to wait for firebase
  thoughtIndex[newKey] = thoughtNew

  // do not do anything with old thoughtIndex if hashes match, as the above line already took care of it
  if (oldKey !== newKey) {
    if (newOldThought) {
      thoughtIndex[oldKey] = newOldThought
    }
    else {
      delete thoughtIndex[oldKey] // eslint-disable-line fp/no-delete
    }
  }

  // if context view, change the contexts of the current thought (which is rendered visually as the parent of the context since are in the context view)
  let thoughtParentNew // eslint-disable-line fp/no-let
  if (showContexts) {

    thoughtParentNew = Object.assign({}, thoughtParentOld, {
      contexts: removeContext(thoughtParentOld, contextOf(pathToContext(thoughtsRankedLiveOld)), rank).contexts.concat({
        context: thoughtsNew,
        rank
      }),
      created: thoughtParentOld.created,
      lastUpdated: timestamp()
    })
    thoughtIndex[hashThought(value)] = thoughtParentNew
  }

  // preserve contextIndex
  const contextNewEncoded = hashContext(showContexts ? thoughtsNew : context)
  const thoughtNewChildren = (state.contextIndex[contextNewEncoded] || [])
    .filter(child =>
      !equalThoughtRanked(child, { value: oldValue, rank }) &&
      !equalThoughtRanked(child, { value: newValue, rank })
    )
    .concat({
      value: showContexts ? value : newValue,
      rank,
      lastUpdated: timestamp()
    })

  // preserve contextIndex
  const contextOldEncoded = hashContext(showContexts ? thoughtsOld : context)
  const thoughtOldChildren = (state.contextIndex[contextOldEncoded] || [])
    .filter(child => !equalThoughtRanked(child, head(thoughtsRankedLiveOld)))

  const contextParentEncoded = hashContext(rootedContextOf(showContexts
    ? context
    : pathToContext(thoughtsRankedLiveOld)
  ))

  const thoughtParentChildren = showContexts ? (state.contextIndex[contextParentEncoded] || [])
    .filter(child =>
      (newOldThought || !equalThoughtRanked(child, { value: oldValue, rank: headRank(rootedContextOf(thoughtsRankedLiveOld)) })) &&
      !equalThoughtRanked(child, { value: newValue, rank: headRank(rootedContextOf(thoughtsRankedLiveOld)) })
    )
    // do not add floating thought to context
   .concat(thoughtOld.contexts.length > 0 ? {
      value: newValue,
      rank: headRank(rootedContextOf(thoughtsRankedLiveOld)),
      lastUpdated: timestamp()
    } : [])
  : null

  // recursive function to change thought within the context of all descendants
  // contextRecursive is the list of additional ancestors built up in recursive calls that must be concatenated to thoughtsNew to get the proper context
  const recursiveUpdates = (thoughtsRanked, contextRecursive = [], accumRecursive = {}) => {

    return getChildrenWithRank(thoughtsRanked, state.thoughtIndex, state.contextIndex).reduce((accum, child) => {

      const hashedKey = hashThought(child.value)
      const childThought = getThought(child.value, thoughtIndex)

      // this should only happen if there is a thoughtIndex integrity violation
      if (!childThought) {
        // console.error(`Missing child ${child.value} in ${pathToContext(thoughtsRanked)}`)
        const accumNew = {
          ...accumRecursive,
          ...accum,
        }
        return {
          ...recursiveUpdates(thoughtsRanked.concat(child), contextRecursive.concat(child.value), accumNew)
        }
      }

      // remove and add the new context of the child
      const contextNew = thoughtsNew.concat(showContexts ? value : []).concat(contextRecursive)
      const childNew = addContext(removeContext(childThought, pathToContext(thoughtsRanked), child.rank), contextNew, child.rank)

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
          context: pathToContext(thoughtsRanked),
          // return parallel lists so that the old contextIndex can be deleted and new contextIndex can be added
          // TODO: This could be improved by putting it directly into the form required by contextIndex to avoid later merging
          contextsOld: ((accumRecursive[hashedKey] || {}).contextsOld || []).concat([pathToContext(thoughtsRanked)]),
          contextsNew: ((accumRecursive[hashedKey] || {}).contextsNew || []).concat([contextNew])
        }
      }

      // merge all updates and pass them on to the recursive call
      return {
        ...accumNew,
        ...recursiveUpdates(thoughtsRanked.concat(child), contextRecursive.concat(child.value), accumNew)
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

  const thoughtIndexUpdates = {
      // if the hashes of oldValue and newValue are equal, thoughtNew takes precedence since it contains the updated thought
    [oldKey]: newOldThought,
    [newKey]: thoughtNew,
    ...descendantUpdates
  }

  const contextIndexUpdates = {
    [contextNewEncoded]: thoughtNewChildren,
    ...(showContexts ? {
      [contextOldEncoded]: thoughtOldChildren,
      [contextParentEncoded]: thoughtParentChildren
    } : null),
    ...contextIndexDescendantUpdates
  }

  const contextIndexNew = {
    ...state.contextIndex,
    ...contextIndexUpdates
  }

  // delete empty contextIndex
  Object.keys(contextIndexUpdates).forEach(contextEncoded => {
    const thoughtNewChildren = contextIndexUpdates[contextEncoded]
    if (!thoughtNewChildren || thoughtNewChildren.length === 0) {
      delete contextIndexNew[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  // preserve contextViews
  const contextViewsNew = { ...state.contextViews }
  if (state.contextViews[contextEncodedNew] !== state.contextViews[contextEncodedOld]) {
    contextViewsNew[contextEncodedNew] = state.contextViews[contextEncodedOld]
    delete contextViewsNew[contextEncodedOld]
  }

  // preserve proseViews
  const proseViewsNew = { ...state.proseViews }
  if (state.proseViews[contextEncodedNew] !== state.proseViews[contextEncodedOld]) {
    proseViewsNew[contextEncodedNew] = state.proseViews[contextEncodedOld]
    delete proseViewsNew[contextEncodedOld]
  }

  setTimeout(() => {
    // do not sync to state since this reducer returns the new state
    sync(thoughtIndexUpdates, contextIndexUpdates, { state: false })

    updateUrlHistory(cursorNew, { thoughtIndex: state.thoughtIndex, contextViews: contextViewsNew, replace: true })

    // persist the cursor to ensure the location does not change through refreshes in standalone PWA mode
    localForage.setItem('cursor', hashContextUrl(pathToContext(cursorNew), { contextViews: contextViewsNew }))
      .catch(err => {
        throw new Error(err)
      })
  })

  return {
    // do not bump thoughtIndex nonce, otherwise editable will be re-rendered
    thoughtIndex,
    // update cursor so that the other contexts superscript and depth-bar will re-render
    // do not update cursorBeforeUpdate as that serves as the transcendental head to identify the thought being edited
    cursor: cursorNew,
    expanded: expandThoughts(cursorNew, thoughtIndex, contextIndexNew, contextViewsNew, contextChain),
    // copy context view to new value
    contextViews: contextViewsNew,
    contextIndex: contextIndexNew,
    proseViews: proseViewsNew,
  }
}
