// util
import { getThought } from '../util'

/** Returns true if the head of the given context exists in the thoughtIndex */
export default (state, value) =>
  value != null && !!getThought(value, state)
