import _ from 'lodash'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import mergeThoughts from '../actions/mergeThoughts'
import rerank from '../actions/rerank'
import updateThoughts from '../actions/updateThoughts'
import { clientId } from '../data-providers/thoughtspaceSession'
import expandThoughts from '../selectors/expandThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import getSortedRank from '../selectors/getSortedRank'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import keyValueBy from '../util/keyValueBy'
import normalizeThought from '../util/normalizeThought'
import pathToContext from '../util/pathToContext'
import reducerFlow from '../util/reducerFlow'
import timestamp from '../util/timestamp'
import alert from './alert'
import deleteAttribute from './deleteAttribute'

export interface MoveThoughtPayload {
  oldPath: Path
  newPath: Path
  offset?: number
  // skip the auto rerank to prevent infinite loop
  skipRerank?: boolean
  /** The new rank of the destination thought. This will be ignored if the thought is moved into a sorted context. */
  newRank: number
  /**
   * ID of sibling after which to place in TreeCRDT.
   * Explicit null means first child.
   */
  afterId: ThoughtId | null
}

/** Derives an explicit TreeCRDT afterId from em's temporary rank ordering. */
export const getMoveThoughtAfterIdByRank = (
  state: State,
  destinationThoughtId: ThoughtId,
  sourceThoughtId: ThoughtId,
  newRank: number,
): ThoughtId | null => {
  const after = getChildrenRanked(state, destinationThoughtId)
    .filter(child => child.id !== sourceThoughtId && child.rank < newRank)
    .at(-1)

  return after?.id ?? null
}

// @MIGRATION_TODO: use (sourceId and destinationId) or simplePath instead of passing paths. Should low level handle context view logic ??
/** Moves a thought from one context to another, or within the same context. */
const moveThought = (state: State, payload: MoveThoughtPayload) => {
  const { oldPath, newPath, offset, skipRerank, newRank, afterId } = payload
  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  const recentlyEdited = state.recentlyEdited
  // try {
  //   recentlyEdited = treeMove(state, state.recentlyEdited, oldPath, newPath)
  // } catch (e) {
  //   console.error('moveThought: treeMove immer error')
  //   console.error(e)
  // }

  const sourceThoughtPath = oldPath
  const destinationThoughtPath = rootedParentOf(state, newPath)
  const sourceThoughtId = head(sourceThoughtPath)
  const destinationThoughtId = head(destinationThoughtPath)

  const sourceThought = getThoughtById(state, sourceThoughtId)

  if (!sourceThought) {
    console.error({ oldPath, newPath, offset, skipRerank, newRank })
    throw new Error(`moveThought: sourceThought not found. ${JSON.stringify({ oldPath, newPath })}`)
  }

  // use parentid from oldPath until parentId data integrity issue is fixed
  const sourceParentId = head(rootedParentOf(state, oldPath))
  if (sourceThought.parentId !== sourceParentId) {
    console.warn(`Invalid parentId: sourceThought.parentId does not match parentOf(oldPath).`)
    console.info('oldPath', oldPath)
    console.info('newPath', newPath)
    console.info('sourceThought', sourceThought)
  }

  const sourceParentThought = getThoughtById(state, sourceParentId)
  const destinationThought = getThoughtById(state, destinationThoughtId)

  if (!sourceParentThought || !destinationThought) {
    console.warn(
      `Missing sourceParentThought${sourceParentId} or destinationThought${destinationThoughtId}. Aborting moveThought.`,
    )
    return state
  }

  const sameContext = sourceParentThought.id === destinationThoughtId
  const childrenOfDestination = getChildrenRanked(state, destinationThoughtId)
  if (
    afterId === sourceThought.id ||
    (afterId !== null && !childrenOfDestination.some(child => child.id === afterId))
  ) {
    throw new Error(`moveThought: afterId must be null or a child of the destination context.`)
  }

  /**
   * Find first normalized duplicate thought.
   */
  const duplicateSubthought = () =>
    childrenOfDestination.find(child => normalizeThought(child.value) === normalizeThought(sourceThought.value))

  // if thought is being moved to the same context that is not a duplicate case
  const duplicateThought = !sameContext ? duplicateSubthought() : null

  const isPendingMerge = duplicateThought && (sourceThought.pending || duplicateThought.pending)

  const destinationContext = pathToContext(state, destinationThoughtPath)

  const isArchived = destinationContext?.indexOf('=archive') !== -1

  // if move is used for archive then update the archived field to latest timestamp
  const archived = isArchived ? timestamp() : destinationThought.archived

  return reducerFlow([
    // disable sort when moving within the same context
    // skip if skipRerank is set (e.g. rerank) to avoid disabling sort during internal rank normalization
    sameContext &&
    !skipRerank &&
    newRank !== sourceThought.rank &&
    getSortPreference(state, destinationThoughtId).type !== 'None'
      ? reducerFlow([
          alert({
            value: 'Switched to manual sort because thought was moved',
          }),
          deleteAttribute({
            path: destinationThoughtPath,
            value: '=sort',
          }),
        ])
      : null,

    state => {
      // Note: In case of duplicate merge, the mergeThoughts handles both the merge, move logic and also calls updateThoughts. So we don't need to handle move logic if duplicate thoughts are merged.
      if (duplicateThought && !isPendingMerge) {
        return mergeThoughts(state, {
          sourceThoughtPath,
          targetThoughtPath: appendToPath(destinationThoughtPath, duplicateThought.id),
        })
      }

      // remove sourceThought from sourceParentThought
      const sourceParentThoughtChildrenMapNew = keyValueBy(sourceParentThought.childrenMap, (key, id) =>
        id !== sourceThought.id ? { [key]: id } : null,
      )

      // add source thought to the destination thought children array
      const destinationThoughtChildrenMapNew = {
        ...destinationThought.childrenMap,
        [isAttribute(sourceThought.value) ? sourceThought.value : sourceThought.id]: sourceThought.id,
      }

      const thoughtIndexUpdates: Index<Thought> = {
        ...(!sameContext
          ? {
              [sourceParentThought.id]: {
                ...sourceParentThought,
                childrenMap: sourceParentThoughtChildrenMapNew,
                lastUpdated: timestamp(),
                updatedBy: clientId,
              },
              [destinationThought.id]: {
                ...destinationThought,
                childrenMap: destinationThoughtChildrenMapNew,
                lastUpdated: timestamp(),
                updatedBy: clientId,
              },
            }
          : {}),
        // update source thought parent id, rank and other stuffs
        [sourceThought.id]: {
          ...sourceThought,
          parentId: destinationThought.id,
          rank:
            // get updated sort preference since the context may have been unsorted
            getSortPreference(state, destinationThoughtId).type !== 'None'
              ? getSortedRank(state, destinationThoughtId, sourceThought.value)
              : newRank,
          ...(archived ? { archived } : null),
          lastUpdated: timestamp(),
          updatedBy: clientId,
        },
      }

      return updateThoughts(state, {
        thoughtIndexUpdates,
        lexemeIndexUpdates: {},
        recentlyEdited,
        preventExpandThoughts: true,
        movePlacements: { [sourceThought.id]: afterId },
      })
    },
    // update cursor if moved path is on the cursor
    state => {
      if (!state.cursor) return state

      const isPathInCursor = isDescendantPath(state.cursor, oldPath)
      const isCursorAtOldPath = state.cursor.length === oldPath.length
      const newCursorPath = isPathInCursor
        ? isCursorAtOldPath
          ? newPath
          : ([...newPath, ...state.cursor.slice(newPath.length)] as Path)
        : state.cursor

      return {
        ...state,
        cursor: newCursorPath,
        ...(offset != null ? { cursorOffset: offset } : null),
      }
    },
    // expand thoughts after cursor has been updated
    state => ({
      ...state,
      expanded: expandThoughts(state, state.cursor),
    }),
    // rerank context if ranks are too close
    // skip if this moveThought originated from a rerank
    // otherwise we get an infinite loop
    !skipRerank
      ? state => {
          const rankPrecision = 10e-8
          const children = getChildrenRanked(state, head(rootedParentOf(state, newPath)))
          const ranksTooClose = children.some((thought, i) => {
            if (i === 0) return false
            const secondThought = getThoughtById(state, children[i - 1].id)
            if (!secondThought) return false
            return Math.abs(thought.rank - secondThought.rank) < rankPrecision
          })
          // TODO: Explicitly converting to simplePath becauase context view has not been implemented yet and later we would want to change oldPath and newPath to be sourceThoughtId and destinationThoughtId instead.
          return ranksTooClose ? rerank(state, rootedParentOf(state, newPath) as SimplePath) : state
        }
      : null,
  ])(state)
}

export type MoveThoughtByRankPayload = Omit<MoveThoughtPayload, 'afterId'>

/** Explicitly adapts a rank-based move to TreeCRDT relative placement while rank remains in em's action model. */
const moveThoughtByRankImpl = (state: State, payload: MoveThoughtByRankPayload): State =>
  moveThought(state, {
    ...payload,
    afterId: getMoveThoughtAfterIdByRank(
      state,
      head(rootedParentOf(state, payload.newPath)),
      head(payload.oldPath),
      payload.newRank,
    ),
  })

export const moveThoughtByRank = _.curryRight(moveThoughtByRankImpl, 2)

/** Action-creator for moveThought. */
export const moveThoughtActionCreator =
  (payload: Parameters<typeof moveThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'moveThought', ...payload })

/** Action-creator for rank-based moves that still need an explicit TreeCRDT placement bridge. */
export const moveThoughtByRankActionCreator =
  (payload: MoveThoughtByRankPayload): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    dispatch(
      moveThoughtActionCreator({
        ...payload,
        afterId: getMoveThoughtAfterIdByRank(
          state,
          head(rootedParentOf(state, payload.newPath)),
          head(payload.oldPath),
          payload.newRank,
        ),
      }),
    )
  }

export default _.curryRight(moveThought, 2)

// Register this action's metadata
registerActionMetadata('moveThought', {
  undoable: true,
})
