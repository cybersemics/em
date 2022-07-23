import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { HOME_PATH } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import isRoot from '../util/isRoot'

/**
 * Generates the SimplePath for a Thought by traversing upwards to the root thought.
 */
const thoughtToPath = (state: State, thoughtId: ThoughtId): SimplePath => {
  if (isRoot([thoughtId])) return HOME_PATH
  const thought = getThoughtById(state, thoughtId)
  return thought
    ? isRoot([thought.parentId])
      ? ([thoughtId] as SimplePath)
      : ([...thoughtToPath(state, thought.parentId), thoughtId] as unknown as SimplePath)
    : HOME_PATH
}

export default thoughtToPath
