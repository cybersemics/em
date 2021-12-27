import { setCursor, updateThoughts } from '.'
import { Path, State } from '../@types'
import mergeThoughts from '../selectors/mergeThoughts'
import { equalArrays, reducerFlow } from '../util'

/**
 * Merges the pending duplicate thoughts that were resulted due to pending thoughts during moveThoughts.
 */
const mergePending = (
  state: State,
  { sourceThoughtPath, targetThoughtPath }: { sourceThoughtPath: Path; targetThoughtPath: Path },
): State => {
  const { thoughtIndexUpdates, contextIndexUpdates, pendingMerges } = mergeThoughts(state, {
    sourceThoughtPath,
    targetThoughtPath,
  })

  const isSourceCursor = state.cursor && equalArrays(state.cursor, sourceThoughtPath)

  return reducerFlow([
    updateThoughts({
      thoughtIndexUpdates,
      contextIndexUpdates,
      pendingMerges,
    }),
    // source thought would be deleted after merge, so changing the cursor to the target thought
    isSourceCursor
      ? setCursor({
          path: targetThoughtPath,
        })
      : null,
  ])(state)
}

export default mergePending
