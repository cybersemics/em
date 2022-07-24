import State from '../@types/State'
import Thought from '../@types/Thought'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isAncestorsVisible from '../selectors/isAncestorsVisible'
import never from '../util/never'
import unroot from '../util/unroot'
import thoughtToContext from './thoughtToContext'

/** Gets all contexts that the given thought is in, sorted and ranked. */
const getContextsSortedAndRanked = (state: State, value: string): Thought[] =>
  // @MIGRATION_TODO: Sort
  getContexts(state, value)
    .filter(id => isAncestorsVisible(state, unroot(thoughtToContext(state, id)!)))
    .flatMap((cxid, i) => {
      const thought = getThoughtById(state, cxid)
      const thoughtRanked = {
        // if the context is pending, return a pending placeholder
        ...(thought || {
          id: cxid,
          childrenMap: {},
          parentId: '', // ???
          pending: true,
          value: '__PENDING__',
          lastUpdated: never(),
          updatedBy: '',
        }),
        // generate dynamic ranks in context view
        rank: i,
      }
      return [thoughtRanked]
    })

export default getContextsSortedAndRanked
