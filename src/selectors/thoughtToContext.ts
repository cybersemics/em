import { getThoughtById } from '../selectors'
import { isRoot } from '../util'
import { Context, State, ThoughtId } from '../@types'
import { HOME_PATH } from '../constants'

/**
 * Generates the Context for a Thought by traversing upwards to the root thought.
 */
const thoughtToContext = (state: State, thoughtId: ThoughtId): Context => {
  if (isRoot([thoughtId])) return HOME_PATH
  const thought = getThoughtById(state, thoughtId)
  return thought
    ? isRoot([thought.parentId])
      ? [thought.value]
      : [...thoughtToContext(state, thought.parentId), thought.value]
    : HOME_PATH
}

export default thoughtToContext
