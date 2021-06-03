import _ from 'lodash'
import { treeMove } from '../util/recentlyEditedTree'
import { render, updateThoughts } from '../reducers'
import { getNextRank, getThought, getChildrenRanked, isPending, simplifyPath, rootedParentOf, pathExists, getAllChildren } from '../selectors'
import { State } from '../util/initialState'
import { Child, Context, Index, Lexeme, Parent, Path, SimplePath, Timestamp } from '../types'

// util
import {
  addContext,
  equalArrays,
  equalThoughtRanked,
  hashContext,
  hashThought,
  head,
  headId,
  headRank,
  isDescendant,
  moveThought,
  normalizeThought,
  parentOf,
  pathToContext,
  reducerFlow,
  removeContext,
  removeDuplicatedContext,
  isDescendantPath,
  timestamp,
} from '../util'

type ChildUpdate = {
  archived?: Timestamp,
  id: string,
  pathNew: Path,
  pathOld: Path,
  pending?: boolean,
  rank: number,
  value: string,
}

type RecursiveMoveResult = {
  lexemeUpdates: Index<Lexeme>,
  childUpdates: Index<ChildUpdate>,
}

/** Moves a thought from one context to another, or within the same context. */
const existingThoughtMove = (state: State, { oldPath, newPath, offset }: {
  oldPath: Path,
  newPath: Path,
  offset?: number,
}) => {
  const oldSimplePath = simplifyPath(state, oldPath)
  const newSimplePath = simplifyPath(state, newPath)
  const thoughtIndexNew = { ...state.thoughts.thoughtIndex }
  const oldThoughts = pathToContext(oldSimplePath)
  const newThoughts = pathToContext(newSimplePath)
  const value = head(oldThoughts)
  const key = hashThought(value)
  const oldRank = headRank(oldSimplePath)
  const oldContext = rootedParentOf(state, oldThoughts)
  const newContext = rootedParentOf(state, newThoughts)
  const sameContext = equalArrays(oldContext, newContext)
  const oldThought = getThought(state, value)

  // guard against missing lexeme (although this should never happen)
  if (!oldThought) {
    console.error('Lexeme not found', oldPath)
    return state
  }

  const duplicateSubthought = getChildrenRanked(state, newContext)
    .find(thought => normalizeThought(thought.value) === normalizeThought(value))

  const isDuplicateMerge = duplicateSubthought && !sameContext

  // If there is a duplicate merge use the previous rank instead of the new
  const newRank = isDuplicateMerge && duplicateSubthought ? duplicateSubthought.rank : headRank(newSimplePath)

  const isArchived = newThoughts.indexOf('=archive') !== -1
  // find exact thought from thoughtIndex
  const exactThought = oldThought.contexts.find(thought => equalArrays(thought.context, oldContext) && thought.rank === oldRank)

  // find id of head thought from exact thought if not available in oldPath
  const id = headId(oldSimplePath) || exactThought?.id

  // if move is used for archive then update the archived field to latest timestamp
  const archived = isArchived || !exactThought
    ? timestamp()
    : exactThought.archived as Timestamp

  const movedThought = moveThought(oldThought, oldContext, newContext, oldRank, newRank, id as string, archived as Timestamp)

  const newThought = removeDuplicatedContext(movedThought, newContext)
  const isPathInCursor = state.cursor && isDescendantPath(state.cursor, oldPath)

  // update thoughtIndex here since recursive updates may have to update same lexeme
  thoughtIndexNew[key] = newThought

  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
  try {
    recentlyEdited = treeMove(state.recentlyEdited, oldPath, newPath)
  }
  catch (e) {
    console.error('existingThoughtMove: treeMove immer error')
    console.error(e)
  }

  // preserve contextIndex
  const contextEncodedOld = hashContext(oldContext)
  const contextEncodedNew = hashContext(newContext)

  // if the contexts have changed, remove the value from the old contextIndex and add it to the new
  const subthoughtsOld = getAllChildren(state, oldContext)
    .filter(child => !equalThoughtRanked(child, { value, rank: oldRank }))

  const subthoughtsNew = getAllChildren(state, newContext)
    .filter(child => normalizeThought(child.value) !== normalizeThought(value))
    .concat({
      value,
      rank: newRank,
      id,
      lastUpdated: timestamp(),
      ...archived ? { archived } : {},
    })

  const shouldUpdateRank = isPathInCursor && isDuplicateMerge

  // if duplicate subthoughts are merged then use rank of the duplicate thought in the new path instead of the newly calculated rank
  const updatedNewPath = shouldUpdateRank && duplicateSubthought
    ? parentOf(newPath).concat(duplicateSubthought)
    : newPath

  const updatedNewSimplePath = shouldUpdateRank && duplicateSubthought
    ? parentOf(newSimplePath).concat(duplicateSubthought)
    : newSimplePath

  /** Updates descendants. */
  const recursiveUpdates = (pathOld: Path, pathNew: Path, contextRecursive: Context = []): RecursiveMoveResult => {

    const newLastRank = getNextRank(state, pathToContext(pathNew)) // get next rank in new path
    const simplePathOld = simplifyPath(state, pathOld)// simple old path
    const oldThoughts = pathToContext(simplePathOld) // old context

    return getChildrenRanked(state, oldThoughts).reduce((accum, child, i) => {

      const hashedKey = hashThought(child.value)
      // lexeme of the moved thought value
      // NOTE: thoughtIndex is updated on the fly
      // @thoughtIndex
      const thoughtAccum = getThought({ ...state, thoughts: { ...state.thoughts, thoughtIndex: thoughtIndexNew } }, child.value)

      if (!thoughtAccum) {
        console.warn(`Missing lexeme "${child.value}"`)
        console.warn('context', oldThoughts)
      }

      const childContext: Context = [...oldThoughts, child.value]
      const childPathOld: Path = [...pathOld, child]

      // why use previous child that doesn't have updated rank here ?
      const childPathNew: Path = [...pathNew, child]

      // context without head. It reprents recursive context from which recursive update has started
      const contextRecursiveNew: Context = [...contextRecursive, child.value]

      // new context of this child
      const contextNew: Context = [...newThoughts, ...contextRecursive]

      // update rank of first depth of childs except when a thought has been moved within the same context
      const movedRank = !sameContext && newLastRank ? newLastRank + i : child.rank

      // if move is used for archive then update the archived field to latest timestamp
      const archived = isArchived || !exactThought
        ? timestamp()
        : exactThought.archived as Timestamp

      // lexeme with old context removed
      // thoughtAccum should always exist, but unfortunately there is a bug somewhere that causes there to be missing lexemes
      // define a new lexeme if the old lexeme is missing
      const childOldThoughtContextRemoved = thoughtAccum
        ? removeContext(thoughtAccum, oldThoughts, child.rank)
        : {
          contexts: [],
          value: child.value,
          created: timestamp(),
          lastUpdated: timestamp()
        }

      // New lexeme
      const childNewThought = removeDuplicatedContext(addContext(childOldThoughtContextRemoved, contextNew, movedRank, child.id as string, archived), contextNew)

      // update local thoughtIndex so that we do not have to wait for firebase
      thoughtIndexNew[hashedKey] = childNewThought

      const childOldContextHash = hashContext(pathToContext(childPathOld))

      const childUpdate: ChildUpdate = {
        // child.id is undefined sometimes. Unable to reproduce.
        id: child.id ?? '',
        // TODO: Confirm that find will always succeed
        rank: ((childNewThought.contexts || [])
          .find(context => equalArrays(context.context, contextNew))
            )!.rank,
        pending: isPending(state, childContext),
        archived,
        pathOld: childPathOld,
        pathNew: childPathNew,
        value: child.value,
      }

      const { lexemeUpdates: recursiveLexemeUpdates, childUpdates: recursivechildUpdates } = recursiveUpdates(childPathOld, childPathNew, contextRecursiveNew)

      return {
        lexemeUpdates: {
          ...accum.lexemeUpdates,
          [hashedKey]: childNewThought,
          ...recursiveLexemeUpdates
        },
        childUpdates: {
          ...accum.childUpdates,
          [childOldContextHash]: childUpdate,
          ...recursivechildUpdates
        }
      }

    }, { lexemeUpdates: {}, childUpdates: {} } as RecursiveMoveResult)
  }

  const conflictedPath = pathExists(state, newContext) ? newContext : null

  const isNewContextPending = conflictedPath && isPending(state, pathToContext(newPath))

  // short-circuit moves if new context is pending
  const { lexemeUpdates, childUpdates } = !isNewContextPending ? recursiveUpdates(oldSimplePath, updatedNewSimplePath) : {
    lexemeUpdates: {},
    childUpdates: {}
  }

  const descendantUpdates = _.transform(lexemeUpdates, (accum, newThought, key: string) => {
    accum[key] = newThought
  }, {} as Index<Lexeme>)

  // Thoughts: Can we calculate contextIndexUpdates inside recursive updates ?

  const contextIndexDescendantUpdates = sameContext
    ? {} as {
      contextIndex: Index<Parent | null>,
      pendingPulls: {path: Path}[],
      descendantMoves: { pathOld: Path, pathNew: Path }[],
    }
    : Object.values(childUpdates).reduce((accum, childUpdate) => {

      // use contextIndex from stale state and add new changes made to contextIndex with each iteartion
      const updatedState: State = { ...state, thoughts: { ...state.thoughts, contextIndex: { ...state.thoughts.contextIndex, ...accum.contextIndex as Index<Parent> } } }

      const newPathParent = parentOf(childUpdate.pathNew)
      const contextNew = pathToContext(newPathParent)
      const contextOld = pathToContext(parentOf(childUpdate.pathOld))
      const contextEncodedOld = hashContext(contextOld)
      const contextEncodedNew = hashContext(contextNew)

      // use updatedState because accum.contextIndex alone doesn't have all information of the previous contextIndex
      const accumInnerChildrenOld = updatedState.thoughts.contextIndex[contextEncodedOld]?.children
      const accumInnerChildrenNew = updatedState.thoughts.contextIndex[contextEncodedNew]?.children

      const normalizedValue = normalizeThought(childUpdate.value)

      const childrenOld = (accumInnerChildrenOld || getAllChildren(updatedState, contextOld))
        .filter((child: Child) => normalizeThought(child.value) !== normalizedValue)

      const childrenNew = (accumInnerChildrenNew || getAllChildren(updatedState, contextNew))
        .filter((child: Child) => normalizeThought(child.value) !== normalizedValue)
        .concat({
          value: childUpdate.value,
          rank: childUpdate.rank,
          lastUpdated: timestamp(),
          // childUpdate.id is undefined sometimes. Unable to reproduce.
          id: childUpdate.id ?? '',
          ...childUpdate.archived ? { archived: childUpdate.archived } : null
        })

      const conflictedPath = pathExists(state, contextNew) ? newPathParent : null
      const isNewContextPending = conflictedPath && isPending(state, contextNew)

      const isNewContextPendingDescendant = accum.pendingPulls.length && isDescendant(pathToContext(accum.pendingPulls[0].path), contextNew)

      const accumNew = {
        contextIndex: {
          ...accum.contextIndex,
          ...!isNewContextPendingDescendant ? { [contextEncodedOld]: childrenOld.length > 0 ? {
            id: contextEncodedOld,
            context: contextOld,
            children: childrenOld,
            lastUpdated: timestamp(),
            ...childUpdate.pending ? { pending: true } : null,
          } : null } : {},
          ...!isNewContextPendingDescendant ? { [contextEncodedNew]: {
            id: contextEncodedNew,
            context: contextNew,
            children: childrenNew,
            lastUpdated: timestamp(),
            ...childUpdate.pending ? { pending: true } : null,
          } } : {},
        },
        pendingPulls: accum.pendingPulls.length === 0 ? [...conflictedPath && isNewContextPending ? [{ path: conflictedPath }] : []] : accum.pendingPulls,
        descendantMoves: [...accum.descendantMoves, ...(conflictedPath && isNewContextPending) || childUpdate.pending ? [{
          pathOld: childUpdate.pathOld,
          pathNew: childUpdate.pathNew,
        }] : []]
      }
      return accumNew
    }
    , {
      contextIndex: {},
      pendingPulls: [] as {path: Path}[],
      descendantMoves: [] as { pathOld: Path, pathNew: Path }[],
    } as {
      contextIndex: Index<Parent | null>,
      pendingPulls: { path: Path }[],
      descendantMoves: { pathOld: Path, pathNew: Path }[],
    })

  const contextIndexUpdates: Index<Parent | null> = {
    [contextEncodedOld]: subthoughtsOld.length > 0 ? {
      id: contextEncodedOld,
      context: oldContext,
      children: subthoughtsOld,
      lastUpdated: timestamp(),
    } : null,
    [contextEncodedNew]: {
      id: contextEncodedNew,
      context: newContext,
      children: subthoughtsNew,
      lastUpdated: timestamp(),
    },
    ...contextIndexDescendantUpdates.contextIndex,
  }

  const thoughtIndexUpdates = {
    [key]: newThought,
    ...descendantUpdates
  }

  // preserve contextViews
  const contextViewsNew = { ...state.contextViews }
  if (state.contextViews[contextEncodedNew] !== state.contextViews[contextEncodedOld]) {
    contextViewsNew[contextEncodedNew] = state.contextViews[contextEncodedOld]
    delete contextViewsNew[contextEncodedOld] // eslint-disable-line fp/no-delete
  }

  /** Returns new path for the given old context.
   * Note: This uses childUpdates so it works only for updated descendants. For main ancestor oldPath that has been moved (ancestor) use updatedNewPath instead.
   */
  const getNewPathFromOldContext = (path: SimplePath) => childUpdates[hashContext(pathToContext(path))].pathNew

  // if cursor is at old path then we don't need to find getNewPathfromContext as we already have updatedNewPath
  // Example: [a.b] (oldPath) and [a.b] (cursor) are subsets of each other
  const isCursorAtOldPath = isPathInCursor && state.cursor?.length === oldPath.length

  const newCursorPath = isPathInCursor ?
    isCursorAtOldPath ?
      updatedNewPath : getNewPathFromOldContext(simplifyPath(state, state.cursor || []))
    : state.cursor

  return reducerFlow([

    state => ({
      ...state,
      contextViews: contextViewsNew,
      cursor: newCursorPath,
      ...offset != null ? { cursorOffset: offset } : null,
    }),

    // update thoughts
    updateThoughts({
      contextIndexUpdates,
      thoughtIndexUpdates,
      recentlyEdited,
      // load the children of the conflicted path if it's pending
      pendingPulls: !isNewContextPending ? contextIndexDescendantUpdates.pendingPulls : [{ path: newPath }],
      descendantMoves: !isNewContextPending ? contextIndexDescendantUpdates.descendantMoves : [{ pathNew: newPath, pathOld: oldPath }],
    }),

    render,

  ])(state)
}

export default _.curryRight(existingThoughtMove, 2)
