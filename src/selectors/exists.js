// util
import { getThought } from '../selectors'

/** Returns true if the head of the given context exists in the thoughtIndex */
export default (state, value) =>
  value != null && !!getThought(state, value)
