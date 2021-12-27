import _ from 'lodash'
import { treeMove } from '../util/recentlyEditedTree'
import { rerank, updateThoughts } from '../reducers'
import { rootedParentOf, getThoughtById, getChildrenRankedById } from '../selectors'
import { Path, SimplePath, State } from '../@types'

// util
import { head, isDescendantPath, reducerFlow } from '../util'
import move from '../selectors/move'

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

  const { thoughtIndexUpdates, contextIndexUpdates, pendingMerges } = move(state, {
    sourceThoughtPath: oldPath,
    destinationThoughtPath: rootedParentOf(state, newPath),
    rank: newRank,
  })

  return reducerFlow([
    state => ({
      ...state,
      cursor: newCursorPath,
      ...(offset != null ? { cursorOffset: offset } : null),
    }),

    // update thoughts
    updateThoughts({
      contextIndexUpdates,
      thoughtIndexUpdates,
      recentlyEdited,
      pendingMerges,
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
