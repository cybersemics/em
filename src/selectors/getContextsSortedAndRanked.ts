import { unroot } from '../util'
import { getContexts, isAncestorsVisible } from '../selectors'
import { ContextThought, State } from '../@types'
import getContextForThought from './getContextForThought'
import { getThoughtById } from './getThought'

/** Gets all contexts that the given thought is in, sorted and ranked. */
const getContextsSortedAndRanked = (state: State, value: string): ContextThought[] =>
  // @MIGRATION_TODO: Sort
  getContexts(state, value)
    .filter(id => isAncestorsVisible(state, unroot(getContextForThought(state, id)!)))
    // generate dynamic ranks
    .map((thoughtContext, i) => {
      const thought = {
        ...getThoughtById(state, thoughtContext),
        rank: i,
      } as ContextThought
      return thought
    })

export default getContextsSortedAndRanked
