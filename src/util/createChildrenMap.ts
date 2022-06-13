import { Index, State, Thought, ThoughtId } from '../@types'
import { isFunction, keyValueBy } from '../util'
import { childIdsToThoughts } from '../selectors'

/** Generates an object for O(1) lookup of a thought's children. Meta attributes are keyed by value and normal or missing thoughts are keyed by id. */
export const createChildrenMapFromThoughts = (children: Thought[]): Index<ThoughtId> =>
  keyValueBy(children, (child, i, accum) => {
    // Firebase keys cannot contain [.$#[\]] or ASCII control characters 0-31 or 127
    // https://firebase.google.com/docs/database/web/structure-data?authuser=1&hl=en#section-limitations
    const value = child.value.replace(/[.$#[\]]/g, '-')

    // use id as key for duplicate child attributes
    const key = child && isFunction(value) && !accum[value] ? value : child.id

    return { [key]: child.id }
  })

/** Generates an object for O(1) lookup of a thought's children. Meta attributes are keyed by value and normal or missing thoughts are keyed by id. */
export const createChildrenMap = (state: State, childrenIds: ThoughtId[]): Index<ThoughtId> =>
  createChildrenMapFromThoughts(childIdsToThoughts(state, childrenIds))

export default createChildrenMap
