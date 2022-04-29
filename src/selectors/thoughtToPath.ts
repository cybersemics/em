import { getThoughtById } from '../selectors'
import { isRoot } from '../util'
import { Path, State, ThoughtId } from '../@types'
import { HOME_PATH } from '../constants'

/**
 * Generates the Path for a Thought by traversing upwards to the root thought.
 */
const thoughtToPath = (state: State, thoughtId: ThoughtId): Path => {
  if (isRoot([thoughtId])) return HOME_PATH
  const thought = getThoughtById(state, thoughtId)
  return thought
    ? isRoot([thought.parentId])
      ? [thoughtId]
      : [...thoughtToPath(state, thought.parentId), thoughtId]
    : HOME_PATH
}

export default thoughtToPath
