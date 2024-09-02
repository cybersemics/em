import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'

/** Prevent thoughts from being deallocated by freeThoughts. The exact reference that is passed in to preserveThoughts can be passed to unpreserveThoughts.. */
const preserveThoughts = (state: State, { thoughtIds }: { thoughtIds: ThoughtId[] }): State => ({
  ...state,
  preservedThoughts: [...(state.preservedThoughts ?? []), thoughtIds],
})

/** Action-creator for preserveThoughts. */
export const preserveThoughtsActionCreator =
  (thoughtIds: ThoughtId[]): Thunk =>
  dispatch =>
    dispatch({ type: 'preserveThoughts', thoughtIds })

export default preserveThoughts
