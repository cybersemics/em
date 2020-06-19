import { getThought } from '../selectors'
import { State } from '../util/initialState'

/** Returns true if the head of the given context exists in the thoughtIndex. */
export default (state: State, value: string) =>
  value != null && !!getThought(state, value)
