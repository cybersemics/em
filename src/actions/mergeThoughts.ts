import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import { clientId } from '../data-providers/thoughtspaceSession'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import equalPath from '../util/equalPath'
import head from '../util/head'
import normalizeThought from '../util/normalizeThought'
import reducerFlow from '../util/reducerFlow'
import timestamp from '../util/timestamp'
import moveThought from './moveThought'
import updateThoughts from './updateThoughts'

/**
 * Merges two given thoughts with the same value by moving all the children of the source thought to the end of the desination thought.
 */
const mergeThoughts = (
  state: State,
  {
    sourceThoughtPath,
    targetThoughtPath,
  }: {
    sourceThoughtPath: Path
    targetThoughtPath: Path
  },
  transaction?: ThoughtspaceTransaction,
): State => {
  const sourceThought = getThoughtById(state, head(sourceThoughtPath))
  const targetThought = getThoughtById(state, head(targetThoughtPath))

  if (!sourceThought) {
    console.warn(`Missing sourceThought${head(sourceThoughtPath)}. Aborting merge.`)
    return state
  }

  if (!targetThought) {
    console.warn(`Missing targetThought${head(targetThoughtPath)}. Aborting merge.`)
    return state
  }

  const sourceParentThought = getThoughtById(state, sourceThought.parentId)
  if (!sourceParentThought) {
    console.warn(`mergeThoughts: source parent ${sourceThought.parentId} is missing. Aborting merge.`)
    return state
  }

  if (sourceThought.id === targetThought.id) {
    throw new Error('Cannot merge a thought to itself.')
  }

  if (normalizeThought(sourceThought.value) !== normalizeThought(targetThought.value)) {
    throw new Error('Cannot merge two thoughts with different values.')
  }

  // moving the children of the source thought to the end of the target context.
  const newStateAfterMove = reducerFlow([
    ...getChildrenRanked(state, sourceThought.id).map(
      child => (updatedState: State) =>
        moveThought(
          updatedState,
          {
            oldPath: appendToPath(sourceThoughtPath, child.id),
            newPath: appendToPath(targetThoughtPath, child.id),
            afterId: getChildrenRanked(updatedState, targetThought.id).at(-1)?.id ?? null,
          },
          transaction,
        ),
    ),
    (state: State) =>
      // if the cursor is on the duplicate that gets deleted (sourceThoughtPath), we need to update it to the preserved thought (targetThoughtPath)
      equalPath(state.cursor, sourceThoughtPath)
        ? {
            ...state,
            cursor: targetThoughtPath,
            editingValue: targetThought.value,
          }
        : state,
  ])(state, transaction)

  const thoughtIndexUpdates: Index<Thought | null> = {
    [sourceParentThought.id]: {
      ...getThoughtById(newStateAfterMove, sourceParentThought.id)!,
      lastUpdated: timestamp(),
      updatedBy: clientId,
    },
    // delete source thought
    [sourceThought.id]: null,
  }

  return updateThoughts(
    newStateAfterMove,
    {
      thoughtIndexUpdates,
      preventExpandThoughts: true,
    },
    transaction,
  )
}

/** Action-creator for mergeThoughts. */
export const mergeThoughtsActionCreator =
  (payload: Parameters<typeof mergeThoughts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'mergeThoughts', ...payload })

export default command(mergeThoughts)

// Register this action's metadata
registerActionMetadata('mergeThoughts', {
  undoable: false,
})
