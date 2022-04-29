import { unroot } from '../util'
import { getContexts, getThoughtById, isAncestorsVisible } from '../selectors'
import { ContextThought, State } from '../@types'
import thoughtToContext from './thoughtToContext'

/** Gets all contexts that the given thought is in, sorted and ranked. */
const getContextsSortedAndRanked = (state: State, value: string): ContextThought[] =>
  // @MIGRATION_TODO: Sort
  getContexts(state, value)
    .filter(id => isAncestorsVisible(state, unroot(thoughtToContext(state, id)!)))
    // generate dynamic ranks
    .map((thoughtContext, i) => {
      const thought = {
        ...getThoughtById(state, thoughtContext),
        rank: i,
      } as ContextThought
      return thought
    })

export default getContextsSortedAndRanked
