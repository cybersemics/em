import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'

/** Allow previously preserved thoughts to be deallocate by freeThoughts. Must match the exact reference passed to preservedThoughts. */
const unpreserveThoughts = (state: State, { thoughtIds }: { thoughtIds: ThoughtId[] | null }): State => {
  let found = false

  const preservedThoughtsNew = state.preservedThoughts?.filter(ids => {
    const match = ids === thoughtIds
    found ||= match
    return !match
  })

  if (!found) {
    console.error(
      'Cannot unpreserve thoughts that are not preserved. The thoughtIds array passed to unpreserveThoughts is compared by reference and must exactly match the thoughtIds array passed to preserceThoughts.',
      { thoughtIds },
    )
  }

  return {
    ...state,
    preservedThoughts: preservedThoughtsNew,
  }
}

/** Action-creator for unpreserveThoughts. */
export const unpreserveThoughtsActionCreator =
  (thoughtIds: ThoughtId[] | null): Thunk =>
  dispatch => {
    if (!thoughtIds) return
    dispatch({ type: 'unpreserveThoughts', thoughtIds })
  }

export default unpreserveThoughts
