import LazyEnv from '../@types/LazyEnv'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import isAttribute from './isAttribute'

/** Finds the the first env entry with =focus/Zoom. O(children). */
const findFirstEnvContextWithZoom = (state: State, { id, env }: { id: ThoughtId; env: LazyEnv }): ThoughtId | null => {
  const children = getAllChildrenAsThoughts(state, id)
  const child = children.find(
    child => isAttribute(child.value) && attribute(state, env[child.value], '=focus') === 'Zoom',
  )
  return child ? findDescendant(state, env[child.value], ['=focus', 'Zoom']) : null
}

export default findFirstEnvContextWithZoom
