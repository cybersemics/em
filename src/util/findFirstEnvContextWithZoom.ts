import LazyEnv from '../@types/LazyEnv'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild } from '../selectors/getChildren'
import isAttribute from './isAttribute'

/** Finds the the first env entry with =focus/Zoom. O(children). */
const findFirstEnvContextWithZoom = (state: State, { id, env }: { id: ThoughtId; env: LazyEnv }): ThoughtId | null => {
  const child = findAnyChild(
    state,
    id,
    child => isAttribute(child.value) && attributeEquals(state, env[child.value], '=focus', 'Zoom'),
  )
  return child ? findDescendant(state, env[child.value], ['=focus', 'Zoom']) : null
}

export default findFirstEnvContextWithZoom
