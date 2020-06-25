import _ from 'lodash'
import { ID } from '../constants'
import { treeMove } from '../util/recentlyEditedTree'
import { render, updateThoughts } from '../reducers'
import { getNextRank, getThought, getThoughts, getThoughtsRanked } from '../selectors'
import { State, ThoughtsInterface } from '../util/initialState'
import { Child, Context, Path, Timestamp } from '../types'

// util
import {
  addContext,
  contextOf,
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
  rootedContextOf,
  subsetThoughts,
  timestamp,
} from '../util'

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
  const oldContext = rootedContextOf(oldThoughts)
  const newContext = rootedContextOf(newThoughts)
  const sameContext = equalArrays(oldContext, newContext)
  const oldThought = getThought(state, value)

  const isArchived = newThoughts.indexOf('=archive') !== -1
  // find exact thought from thoughtIndex
  const exactThought = oldThought.contexts.find(thought => equalArrays(thought.context, oldContext) && thought.rank === oldRank)

  // find id of head thought from exact thought if not available in oldPath
  const id = headId(oldPath) || exactThought?.id

  // if move is used for archive then update the archived field to latest timestamp
  const archived = isArchived ? timestamp() : exactThought!.archived as Timestamp

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
  const recursiveUpdates = (oldThoughtsRanked: Path, newThoughtsRanked: Path, contextRecursive: Context = [], accumRecursive: any = {}): any => {

    const newLastRank = getNextRank(state, pathToContext(newThoughtsRanked))

    return getThoughtsRanked(state, oldThoughtsRanked).reduce((accum, child, i) => {
      const hashedKey = hashThought(child.value)
      const childThought = getThought({ thoughts: { thoughtIndex: thoughtIndexNew } }, child.value)

      // remove and add the new context of the child
      const contextNew = newThoughts.concat(contextRecursive)

      // update rank of first depth of childs except when a thought has been moved within the same context
      const movedRank = !sameContext && newLastRank ? newLastRank + i : child.rank

      // if move is used for archive then update the archived field to latest timestamp
      const archived = isArchived ? timestamp() : exactThought!.archived as Timestamp

      const childNewThought = removeDuplicatedContext(addContext(removeContext(childThought, pathToContext(oldThoughtsRanked), child.rank), contextNew, movedRank, child.id as string, archived as Timestamp), contextNew)

      // update local thoughtIndex so that we do not have to wait for firebase
      thoughtIndexNew[hashedKey] = childNewThought

      const accumNew = {
        // merge ancestor updates
        ...accumRecursive,
        // merge sibling updates
        // Order matters: accum must have precendence over accumRecursive so that contextNew is correct
        ...accum,
        // merge current thought update
        [hashedKey]: {
          value: child.value,
          // eslint-disable-next-line no-extra-parens
          rank: ((childNewThought.contexts || [])
            .find(context => equalArrays(context.context, contextNew)) as any
          ).rank,
          id: child.id,
          archived,
          thoughtIndex: childNewThought,
          context: pathToContext(oldThoughtsRanked),
          contextsOld: ((accumRecursive[hashedKey] || {}).contextsOld || []).concat([pathToContext(oldThoughtsRanked)]),
          contextsNew: ((accumRecursive[hashedKey] || {}).contextsNew || []).concat([contextNew])
        }
      }

      return {
        ...accumNew,
        ...recursiveUpdates(oldThoughtsRanked.concat(child), newThoughtsRanked.concat(child), contextRecursive.concat(child.value), accumNew)
      }
    }, {})
  }

  const descendantUpdatesResult = recursiveUpdates(oldPath, newPath)
  const descendantUpdates = _.transform(descendantUpdatesResult, (accum: any, value: ThoughtsInterface, key: string) => {
    accum[key] = value.thoughtIndex
  }, {})

  const contextIndexDescendantUpdates = sameContext
    ? {}
    : _.transform(descendantUpdatesResult, (accum: any, result: any) => {
      const output = result.contextsOld.reduce((accumInner: any, contextOld: Context, i: number) => {
        const contextNew = result.contextsNew[i]
        const contextEncodedOld = hashContext(contextOld)
        const contextEncodedNew = hashContext(contextNew)
        const accumChildrenOld = accum[contextEncodedOld] && accum[contextEncodedOld].children
        const accumChildrenNew = accum[contextEncodedNew] && accum[contextEncodedNew].children
        const childrenOld = (accumChildrenOld || getThoughts(state, contextOld))
          .filter((child: Child) => child.value !== result.value)
        const childrenNew = (accumChildrenNew || getThoughts(state, contextNew))
          .filter((child: Child) => child.value !== result.value)
          .concat({
            value: result.value,
            rank: result.rank,
            lastUpdated: timestamp(),
            id: result.id,
            ...result.archived ? { archived: result.archived } : {}
          })
        return {
          ...accumInner,
          [contextEncodedOld]: childrenOld.length > 0 ? {
            children: childrenOld,
            lastUpdated: timestamp(),
          } : null,
          [contextEncodedNew]: {
            children: childrenNew,
            lastUpdated: timestamp(),
          }
        }
      }, {})
      Object.assign(accum, output) // eslint-disable-line fp/no-mutating-assign
    }, {})

  const contextIndexUpdates = {
    [contextEncodedOld]: subthoughtsOld.length > 0 ? {
      children: subthoughtsOld,
      lastUpdated: timestamp(),
    } : null,
    [contextEncodedNew]: {
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
      return { ...child, rank: updatedThought ? updatedThought.rank : child.rank, id: child.id }
    }
  )

  // if duplicate subthoughts are merged then update rank of thoughts of cursor descendants
  const cursorDescendantPath = (isPathInCursor && isDuplicateMerge ? updateMergedThoughtsRank : ID)(state.cursor || []).slice(oldPath.length)

  // if duplicate subthoughts are merged then use rank of the duplicate thought in the new path instead of the newly calculated rank
  const updatedNewPath = isPathInCursor && isDuplicateMerge && duplicateSubthought
    ? contextOf(newPath).concat(duplicateSubthought)
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
      cursorOffset: offset,
    }),

    // update thoughts
    // @ts-ignore
    state => updateThoughts(state, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited }),

    // render
    render,

  ])(state)
}

export default existingThoughtMove
