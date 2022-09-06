import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { EM_TOKEN, HOME_PATH } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import isRoot from '../util/isRoot'

/** Generates the SimplePath for a Thought by traversing upwards to the root thought. Return null if any ancestors are missing, e.g. pending context. */
const thoughtToPath = (state: State, thoughtId: ThoughtId): SimplePath => {
  if (isRoot([thoughtId]) || thoughtId === EM_TOKEN) return [thoughtId] as SimplePath
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return HOME_PATH
  if (isRoot([thought.parentId])) return [thoughtId] as SimplePath
  const pathSegment = thoughtToPath(state, thought.parentId)
  return [...pathSegment, thoughtId] as unknown as SimplePath
}

export default thoughtToPath
