import _ from 'lodash'
import { treeMove } from '../util/recentlyEditedTree'
import { rerank, mergeThoughts, updateThoughts } from '../reducers'
import { expandThoughts, getThoughtById, getChildrenRankedById, rootedParentOf } from '../selectors'
import { Path, SimplePath, State } from '../@types'
import { appendToPath, head, isDescendantPath, normalizeThought, pathToContext, reducerFlow, timestamp } from '../util'
import { getSessionId } from '../util/sessionManager'

export interface MoveThoughtPayload {
  oldPath: Path
  newPath: Path
  offset?: number
  // skip the auto rerank to prevent infinite loop
  skipRerank?: boolean
  newRank: number
}

// @MIGRATION_TODO: use (sourceId and destinationId) or simplePath instead of passing paths. Should low level handle context view logic ??
/** Moves a thought from one context to another, or within the same context. */
const moveThought = (state: State, { oldPath, newPath, offset, skipRerank, newRank }: MoveThoughtPayload) => {
  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
  try {
    recentlyEdited = treeMove(state, state.recentlyEdited, oldPath, newPath)
  } catch (e) {
    console.error('moveThought: treeMove immer error')
    console.error(e)
  }

  const sourceThoughtPath = oldPath
  const destinationThoughtPath = rootedParentOf(state, newPath)
  const sourceThoughtId = head(sourceThoughtPath)
  const destinationThoughtId = head(destinationThoughtPath)

  const sourceThought = getThoughtById(state, sourceThoughtId)
  const sourceParentThought = getThoughtById(state, sourceThought.parentId)
  const destinationThought = getThoughtById(state, destinationThoughtId)

  const sameContext = sourceParentThought.id === destinationThoughtId
  const childrenOfDestination = getChildrenRankedById(state, destinationThoughtId)

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
    state => {
      // Note: Incase of duplicate merge, the mergeThoughts handles both the merge, move logic and also calls updateThoughts. So we don't need to handle move logic if duplicate thoughts are merged.
      if (duplicateThought && !isPendingMerge) {
        return mergeThoughts(state, {
          sourceThoughtPath,
          targetThoughtPath: appendToPath(destinationThoughtPath, duplicateThought.id),
        })
      }

      const thoughtIndexUpdates = {
        ...(!sameContext
          ? {
              // remove source thought from the previous source parent children array
              [sourceParentThought.id]: {
                ...sourceParentThought,
                children: sourceParentThought.children.filter(thoughtId => thoughtId !== sourceThought.id),
                lastUpdated: timestamp(),
                updatedBy: getSessionId(),
              },
              // add source thought to the destination thought children array
              [destinationThought.id]: {
                ...destinationThought,
                children: [...destinationThought.children, sourceThought.id],
                lastUpdated: timestamp(),
                updatedBy: getSessionId(),
              },
            }
          : {}),
        // update source thought parent id, rank and other stuffs
        [sourceThought.id]: {
          ...sourceThought,
          parentId: destinationThought.id,
          rank: newRank,
          archived,
          lastUpdated: timestamp(),
          updatedBy: getSessionId(),
        },
      }

      const pendingMerges =
        isPendingMerge && duplicateThought
          ? [
              {
                sourcePath: appendToPath(destinationThoughtPath, sourceThought.id),
                targetPath: appendToPath(destinationThoughtPath, duplicateThought.id),
              },
            ]
          : []

      return updateThoughts(state, {
        thoughtIndexUpdates,
        lexemeIndexUpdates: {},
        recentlyEdited,
        pendingMerges,
        preventExpandThoughts: true,
      })
    },
    // update cursor
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
          const children = getChildrenRankedById(state, head(rootedParentOf(state, newPath)))
          const ranksTooClose = children.some((thought, i) => {
            if (i === 0) return false
            const secondThought = getThoughtById(state, children[i - 1].id)
            return Math.abs(thought.rank - secondThought.rank) < rankPrecision
          })
          // TODO: Explicitly converting to simplePath becauase context view has not been implemented yet and later we would want to change oldPath and newPath to be sourceThoughtId and destinationThoughtId instead.
          return ranksTooClose ? rerank(state, rootedParentOf(state, newPath) as SimplePath) : state
        }
      : null,
  ])(state)
}

export default _.curryRight(moveThought, 2)
