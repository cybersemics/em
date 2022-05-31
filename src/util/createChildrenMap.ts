import { State, ThoughtId } from '../@types'
import { isFunction, keyValueBy } from '../util'
import { getThoughtById } from '../selectors'

/** Generates an object for O(1) lookup of a thought's children. Meta attributes are keyed by value and normal or missing thoughts are keyed by id. */
export const createChildrenMap = (state: State, children: ThoughtId[]) =>
  keyValueBy<ThoughtId, ThoughtId>(children, (childId, i, accum) => {
    const child = getThoughtById(state, childId)

    // Firebase keys cannot contain [.$#[\]] or ASCII control characters 0-31 or 127
    // https://firebase.google.com/docs/database/web/structure-data?authuser=1&hl=en#section-limitations
    const value = child.value.replace(/[.$#[\]]/g, '-')

    // use id as key for duplicate child attributes
    const key = child && isFunction(value) && !accum[value] ? value : childId

    return { [key]: childId }
  })

export default createChildrenMap
