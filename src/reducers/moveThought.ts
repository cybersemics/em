import _ from 'lodash'
import { treeMove } from '../util/recentlyEditedTree'
import { rerank, updateThoughts, mergeThoughts } from '../reducers'
import { rootedParentOf, getThoughtById, getChildrenRankedById } from '../selectors'
import { Path, SimplePath, State } from '../@types'

// util
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

  const isPathInCursor = state.cursor && isDescendantPath(state.cursor, oldPath)

  const isCursorAtOldPath = isPathInCursor && state.cursor?.length === oldPath.length

  // eslint-disable-next-line jsdoc/require-jsdoc
  const getUpdateCursor = () => {
    if (!state.cursor) return null
    return [...newPath, ...state.cursor.slice(newPath.length)] as Path
  }

  const newCursorPath = isPathInCursor ? (isCursorAtOldPath ? newPath : getUpdateCursor()) : state.cursor

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
   * Find duplicate thought.
   */
  const duplicateSubthought = () =>
    childrenOfDestination.find(child => normalizeThought(child.value) === normalizeThought(sourceThought.value))

  // if thought is being moved to the same context that is not a duplicate case
  const duplicateThought = !sameContext ? duplicateSubthought() : undefined

  const isPendingMerge = duplicateThought && (sourceThought.pending || duplicateThought.pending)

  const newStateAfterMerge =
    !!duplicateThought &&
    !isPendingMerge &&
    mergeThoughts(state, {
      sourceThoughtPath,
      targetThoughtPath: appendToPath(destinationThoughtPath, duplicateThought.id),
    })

  const destinationContext = pathToContext(state, destinationThoughtPath)

  const isArchived = destinationContext?.indexOf('=archive') !== -1

  // if move is used for archive then update the archived field to latest timestamp
  const archived = isArchived ? timestamp() : destinationThought.archived

  const contextIndexUpdates = newStateAfterMerge
    ? {}
    : {
        // if moved within same context we don't need to remove and add source thought from source parent to the destination
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

  return reducerFlow([
    state => ({
      ...state,
      cursor: newCursorPath,
      ...(offset != null ? { cursorOffset: offset } : null),
    }),
    // update thoughts
    newStateAfterMerge
      ? null
      : updateThoughts({
          contextIndexUpdates,
          thoughtIndexUpdates: {},
          recentlyEdited,
          pendingMerges:
            isPendingMerge && duplicateThought
              ? [
                  {
                    sourcePath: appendToPath(destinationThoughtPath, sourceThought.id),
                    targetPath: appendToPath(destinationThoughtPath, duplicateThought.id),
                  },
                ]
              : [],
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
  ])(newStateAfterMerge || state)
}

export default _.curryRight(moveThought, 2)
