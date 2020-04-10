// util
import { getThought } from '../util'

/** Returns true if the head of the given context exists in the thoughtIndex */
export default ({ thoughtIndex }, value) =>
  value != null && !!getThought(value, thoughtIndex)
