import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { getChildrenRanked } from './getChildren'
import getThoughtById from './getThoughtById'

/** Gets the preceding sibling in stored order, including hidden attributes and excluding the thought being moved. */
const getPreviousSiblingId = (state: State, id: ThoughtId, { excludeId }: { excludeId?: ThoughtId } = {}) => {
  const thought = getThoughtById(state, id)
  if (!thought) throw new Error(`Cannot place before missing thought ${id}`)
  const siblings = getChildrenRanked(state, thought.parentId).filter(child => child.id !== excludeId)
  const index = siblings.findIndex(child => child.id === id)
  return siblings[index - 1]?.id ?? null
}

export default getPreviousSiblingId
