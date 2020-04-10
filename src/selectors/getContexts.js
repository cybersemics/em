// util
import { getThought, isDivider } from '../util'

/** Returns a list of contexts that the given thought is a member of. */
export default ({ thoughtIndex }, value) => {
  if (isDivider(value)) return []
  return (getThought(value, thoughtIndex) || {}).contexts || []
}
