import unroot from '../util/unroot'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isAncestorsVisible from '../selectors/isAncestorsVisible'
import ContextThought from '../@types/ContextThought'
import State from '../@types/State'
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
