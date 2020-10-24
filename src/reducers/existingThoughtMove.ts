import _ from 'lodash'
import { ID } from '../constants'
import { treeMove } from '../util/recentlyEditedTree'
import { render, updateThoughts } from '../reducers'
import { getNextRank, getThought, getThoughts, getThoughtsRanked } from '../selectors'
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
  newThought: Lexeme,
  context: Context,
  contextsOld: Context[],
  contextsNew: Context[],
  archived?: Timestamp,
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
  const subthoughtsOld = getThoughts(state, oldContext)
    .filter(child => !equalThoughtRanked(child, { value, rank: oldRank }))

  const duplicateSubthought = getThoughtsRanked(state, newContext)
    .find(equalThoughtValue(value))

  const isDuplicateMerge = duplicateSubthought && !sameContext

  const subthoughtsNew = getThoughts(state, newContext)
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
    return getThoughtsRanked(state, oldThoughts).reduce((accum, child, i) => {
      const hashedKey = hashThought(child.value)
      const childThought = getThought({ ...state, thoughts: { ...state.thoughts, thoughtIndex: thoughtIndexNew } }, child.value)

      // remove and add the new context of the child
      const contextNew = newThoughts.concat(contextRecursive)

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
          archived,
          newThought: childNewThought,
          context: oldThoughts,
          contextsOld: ((accumRecursive[hashedKey] || {}).contextsOld || []).concat([oldThoughts]),
          contextsNew: ((accumRecursive[hashedKey] || {}).contextsNew || []).concat([contextNew])
        }
      }

      return {
        ...accumNew,
        ...recursiveUpdates(pathOld.concat(child), pathNew.concat(child), contextRecursive.concat(child.value), accumNew)
      }
    }, {} as Index<RecursiveMoveResult>)
  }

  const descendantUpdatesResult = recursiveUpdates(oldPath, newPath)
  const descendantUpdates = _.transform(descendantUpdatesResult, (accum, { newThought }, key: string) => {
    accum[key] = newThought
  }, {} as Index<Lexeme>)

  const contextIndexDescendantUpdates = sameContext
    ? {}
    : _.transform(descendantUpdatesResult, (accum, result) => {
      const output = result.contextsOld.reduce((accumInner, contextOld, i) => {
        const contextNew = result.contextsNew[i]
        const contextEncodedOld = hashContext(contextOld)
        const contextEncodedNew = hashContext(contextNew)
        const accumChildrenOld = accum[contextEncodedOld]?.children
        const accumChildrenNew = accum[contextEncodedNew]?.children
        const childrenOld = (accumChildrenOld || getThoughts(state, contextOld))
          .filter((child: Child) => child.value !== result.value)
        const childrenNew = (accumChildrenNew || getThoughts(state, contextNew))
          .filter((child: Child) => child.value !== result.value)
          .concat({
            value: result.value,
            rank: result.rank,
            lastUpdated: timestamp(),
            // result.id is undefined sometimes. Unable to reproduce.
            id: result.id ?? '',
            ...result.archived ? { archived: result.archived } : null
          })
        return {
          ...accumInner,
          [contextEncodedOld]: childrenOld.length > 0 ? {
            context: contextOld,
            children: childrenOld,
            lastUpdated: timestamp(),
          } : null,
          [contextEncodedNew]: {
            context: contextNew,
            children: childrenNew,
            lastUpdated: timestamp(),
          }
        }
      }, {} as Index<Parent | null>)
      Object.assign(accum, output) // eslint-disable-line fp/no-mutating-assign
    }, {} as Index<Parent | null>)

  const contextIndexUpdates = {
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
    ...contextIndexDescendantUpdates
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
    updateThoughts({ thoughtIndexUpdates, contextIndexUpdates, recentlyEdited }),

    // render
    render,

  ])(state)
}

export default _.curryRight(existingThoughtMove, 2)
