import { State, ThoughtId } from '../@types'
import { isFunction, keyValueBy } from '../util'
import { getThoughtById } from '../selectors'

/** Generates an object for O(1) lookup of a thought's children. Meta attributes are keyed by value and normal or missing thoughts are keyed by id. */
export const createChildrenMap = (state: State, children: ThoughtId[]) =>
  keyValueBy(children, childId => {
    const child = getThoughtById(state, childId)
    return { [child && isFunction(child.value) ? child.value : childId]: childId }
  })

export default createChildrenMap
