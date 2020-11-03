import _ from 'lodash'
import { ID } from '../constants'
import { treeMove } from '../util/recentlyEditedTree'
import { render, updateThoughts } from '../reducers'
import { getNextRank, getThought, getAllChildren, getChildrenRanked, isPending } from '../selectors'
import { State } from '../util/initialState'
import { Child, Context, Index, Lexeme, Parent, Path, Timestamp } from '../types'

// util
import {
  addContext,
  parentOf,
  equalArrays,
  equalThoughtRanked,
  equalThoughtValue,
  hashContext,
  hashThought,
  head,
  headId,
  headRank,
  moveThought,
  pathToContext,
  reducerFlow,
  removeContext,
  removeDuplicatedContext,
  rootedParentOf,
  subsetThoughts,
  timestamp,
} from '../util'

type RecursiveMoveResult = Child & {
  archived?: Timestamp,
  pending?: boolean,
  context: Context,
  contextsOld: Context[],
  contextsNew: Context[],
  pathOld: Path,
  pathNew: Path,
  newThought: Lexeme,
}

/** Moves a thought from one context to another, or within the same context. */
const existingThoughtMove = (state: State, { oldPath, newPath, offset }: {
  oldPath: Path,
  newPath: Path,
  offset?: number,
}) => {
  const thoughtIndexNew = { ...state.thoughts.thoughtIndex }
  const oldThoughts = pathToContext(oldPath)
  const newThoughts = pathToContext(newPath)
  const value = head(oldThoughts)
  const key = hashThought(value)
  const oldRank = headRank(oldPath)
  const newRank = headRank(newPath)
  const oldContext = rootedParentOf(oldThoughts)
  const newContext = rootedParentOf(newThoughts)
  const sameContext = equalArrays(oldContext, newContext)
  const oldThought = getThought(state, value)

  const isArchived = newThoughts.indexOf('=archive') !== -1
  // find exact thought from thoughtIndex
  const exactThought = oldThought.contexts.find(thought => equalArrays(thought.context, oldContext) && thought.rank === oldRank)

  // find id of head thought from exact thought if not available in oldPath
  const id = headId(oldPath) || exactThought?.id

  // if move is used for archive then update the archived field to latest timestamp
  const archived = isArchived || !exactThought
    ? timestamp()
    : exactThought.archived as Timestamp

  const movedThought = moveThought(oldThought, oldContext, newContext, oldRank, newRank, id as string, archived as Timestamp)

  const newThought = removeDuplicatedContext(movedThought, newContext)
  const isPathInCursor = state.cursor && subsetThoughts(state.cursor, oldPath)

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

  const duplicateSubthought = getChildrenRanked(state, newContext)
    .find(equalThoughtValue(value))

  const isDuplicateMerge = duplicateSubthought && !sameContext

  const subthoughtsNew = getAllChildren(state, newContext)
    .filter(child => child.value !== value)
    .concat({
      value,
      rank: isDuplicateMerge && duplicateSubthought ? duplicateSubthought.rank : newRank,
      id,
      lastUpdated: timestamp(),
      ...archived ? { archived } : {},
    })

  /** Updates descendants. */
  const recursiveUpdates = (pathOld: Path, pathNew: Path, contextRecursive: Context = [], accumRecursive: Index<RecursiveMoveResult> = {}): Index<RecursiveMoveResult> => {

    const newLastRank = getNextRank(state, pathToContext(pathNew))
    const oldThoughts = pathToContext(pathOld)

    return getChildrenRanked(state, oldThoughts).reduce((accum, child, i) => {
      const hashedKey = hashThought(child.value)
      const childThought = getThought({ ...state, thoughts: { ...state.thoughts, thoughtIndex: thoughtIndexNew } }, child.value)
      const childContext: Context = [...oldThoughts, child.value]
      const childPathOld: Path = [...pathOld, child]
      const childPathNew: Path = [...pathNew, child]
      const contextRecursiveNew: Context = [...contextRecursive, child.value]
      const contextNew: Context = [...newThoughts, ...contextRecursive]

      // update rank of first depth of childs except when a thought has been moved within the same context
      const movedRank = !sameContext && newLastRank ? newLastRank + i : child.rank

      // if move is used for archive then update the archived field to latest timestamp
      const archived = isArchived || !exactThought
        ? timestamp()
        : exactThought.archived as Timestamp

      const childNewThought = removeDuplicatedContext(addContext(removeContext(childThought, oldThoughts, child.rank), contextNew, movedRank, child.id as string, archived as Timestamp), contextNew)

      // update local thoughtIndex so that we do not have to wait for firebase
      thoughtIndexNew[hashedKey] = childNewThought

      const accumNew: Index<RecursiveMoveResult> = {
        // merge ancestor updates
        ...accumRecursive,
        // merge sibling updates
        // Order matters: accum must have precendence over accumRecursive so that contextNew is correct
        ...accum,
        // merge current thought update
        [hashedKey]: {
          value: child.value,
          // TODO: Confirm that find will always succeed
          rank: ((childNewThought.contexts || [])
            .find(context => equalArrays(context.context, contextNew))
          )!.rank,
          // child.id is undefined sometimes. Unable to reproduce.
          id: child.id ?? '',
          pending: isPending(state, childContext),
          archived,
          newThought: childNewThought,
          context: oldThoughts,
          pathOld: childPathOld,
          pathNew: childPathNew,
          contextsOld: ((accumRecursive[hashedKey] || {}).contextsOld || []).concat([oldThoughts]),
          contextsNew: ((accumRecursive[hashedKey] || {}).contextsNew || []).concat([contextNew]),
        }
      }

      return {
        ...accumNew,
        ...recursiveUpdates(childPathOld, childPathNew, contextRecursiveNew, accumNew)
      }
    }, {} as Index<RecursiveMoveResult>)
  }

  const descendantUpdatesResult = recursiveUpdates(oldPath, newPath)
  const descendantUpdates = _.transform(descendantUpdatesResult, (accum, { newThought }, key: string) => {
    accum[key] = newThought
  }, {} as Index<Lexeme>)

  const contextIndexDescendantUpdates = sameContext
    ? {} as {
      contextIndex: Index<Parent | null>,
      pendingMoves: { pathOld: Path, pathNew: Path }[],
    }
    : _.transform(descendantUpdatesResult, (accum, result) => {
      const output = result.contextsOld.reduce((accum, contextOld, i) => {
        const contextNew = result.contextsNew[i]
        const contextEncodedOld = hashContext(contextOld)
        const contextEncodedNew = hashContext(contextNew)
        const accumChildrenOld = accum.contextIndex[contextEncodedOld]?.children
        const accumChildrenNew = accum.contextIndex[contextEncodedNew]?.children
        const childrenOld = (accumChildrenOld || getAllChildren(state, contextOld))
          .filter((child: Child) => child.value !== result.value)
        const childrenNew = (accumChildrenNew || getAllChildren(state, contextNew))
          .filter((child: Child) => child.value !== result.value)
          .concat({
            value: result.value,
            rank: result.rank,
            lastUpdated: timestamp(),
            // result.id is undefined sometimes. Unable to reproduce.
            id: result.id ?? '',
            ...result.archived ? { archived: result.archived } : null
          })

        // if (result.pending) {
        //   return {
        //     contextIndex: {},
        //     pendingMoves: [...accum.pendingMoves, ...result.pending ? [{
        //       pathOld: result.pathOld,
        //       pathNew: result.pathNew,
        //     }] : []]
        //   }
        // }

        return {
          contextIndex: {
            ...accum.contextIndex,
            [contextEncodedOld]: childrenOld.length > 0 ? {
              context: contextOld,
              children: childrenOld,
              lastUpdated: timestamp(),
              ...result.pending ? { pending: true } : null,
            } : null,
            [contextEncodedNew]: {
              context: contextNew,
              children: childrenNew,
              lastUpdated: timestamp(),
              ...result.pending ? { pending: true } : null,
            },
          },
          // pendingMoves: accum.pendingMoves,
          pendingMoves: [...accum.pendingMoves, ...result.pending ? [{
            pathOld: result.pathOld,
            pathNew: result.pathNew,
          }] : []]
        }
      }, {
        contextIndex: {},
        pendingMoves: [] as { pathOld: Path, pathNew: Path }[]
      } as {
        contextIndex: Index<Parent | null>,
        pendingMoves: { pathOld: Path, pathNew: Path }[],
      })

      Object.assign(accum.contextIndex, output.contextIndex) // eslint-disable-line fp/no-mutating-assign
      accum.pendingMoves = [...accum.pendingMoves, ...output.pendingMoves || []] // eslint-disable-line fp/no-mutating-assign
    }, {
      contextIndex: {},
      pendingMoves: [] as { pathOld: Path, pathNew: Path }[]
    } as {
      contextIndex: Index<Parent | null>,
      pendingMoves: { pathOld: Path, pathNew: Path }[],
    })

  const contextIndexUpdates: Index<Parent | null> = {
    [contextEncodedOld]: subthoughtsOld.length > 0 ? {
      context: oldContext,
      children: subthoughtsOld,
      lastUpdated: timestamp(),
    } : null,
    [contextEncodedNew]: {
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

  thoughtIndexNew[key] = newThought

  // preserve contextViews
  const contextViewsNew = { ...state.contextViews }
  if (state.contextViews[contextEncodedNew] !== state.contextViews[contextEncodedOld]) {
    contextViewsNew[contextEncodedNew] = state.contextViews[contextEncodedOld]
    delete contextViewsNew[contextEncodedOld] // eslint-disable-line fp/no-delete
  }

  /** Updates the ranks within the given path to match those in descendantUpdatesResult. */
  const updateMergedThoughtsRank = (path: Path) => path.map(
    (child: Child) => {
      const updatedThought = descendantUpdatesResult[hashThought(child.value)]
      // child.id is undefined sometimes. Unable to reproduce.
      return {
        ...child,
        rank: updatedThought ? updatedThought.rank : child.rank,
        id: child.id ?? '',
      } as Child
    }
  )

  // if duplicate subthoughts are merged then update rank of thoughts of cursor descendants
  const cursorDescendantPath = (isPathInCursor && isDuplicateMerge ? updateMergedThoughtsRank : ID)(state.cursor || []).slice(oldPath.length)

  // if duplicate subthoughts are merged then use rank of the duplicate thought in the new path instead of the newly calculated rank
  const updatedNewPath = isPathInCursor && isDuplicateMerge && duplicateSubthought
    ? parentOf(newPath).concat(duplicateSubthought)
    : newPath

  const newCursorPath = isPathInCursor
    ? updatedNewPath.concat(cursorDescendantPath)
    : state.cursor

  return reducerFlow([

    state => ({
      ...state,
      contextViews: contextViewsNew,
      cursor: newCursorPath,
      cursorBeforeEdit: newCursorPath,
      ...offset != null ? { cursorOffset: offset } : null,
    }),

    // update thoughts
    updateThoughts({
      contextIndexUpdates,
      thoughtIndexUpdates,
      recentlyEdited,
      pendingMoves: contextIndexDescendantUpdates.pendingMoves,
    }),

    // render
    render,

  ])(state)
}

export default _.curryRight(existingThoughtMove, 2)
