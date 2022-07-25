import _ from 'lodash'
import State from '../@types/State'
import Thought from '../@types/Thought'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isAncestorsVisible from '../selectors/isAncestorsVisible'
import never from '../util/never'
import parentOf from '../util/parentOf'
import unroot from '../util/unroot'
import childIdsToThoughts from './childIdsToThoughts'
import rootedParentOf from './rootedParentOf'
import thoughtToContext from './thoughtToContext'
import thoughtToPath from './thoughtToPath'

/** Gets all contexts that the given thought is in, sorted and ranked. */
const getContextsSortedAndRanked = (state: State, value: string): Thought[] => {
  const contexts = getContexts(state, value)
    .filter(id => isAncestorsVisible(state, unroot(thoughtToContext(state, id)!)))
    .map((cxid, i) => {
      const thought = getThoughtById(state, cxid)
      const thoughtRanked = {
        // if the context is pending, return a pending placeholder
        ...(thought || {
          id: cxid,
          childrenMap: {},
          parentId: '', // ???
          pending: true,
          rank: i, // overwritten by contextSorted
          value: '__PENDING__',
          lastUpdated: never(),
          updatedBy: '',
        }),
      }
      return thoughtRanked
    })

  // sort by hashed ancestor values
  const contextsSorted = _.sortBy(contexts, thought => {
    const path = unroot(thoughtToPath(state, thought.id))
    const breadcrumbs = rootedParentOf(state, parentOf(path))
    const thoughts = childIdsToThoughts(state, breadcrumbs).map(thought => thought?.value || '__MISSING__')
    return thoughts.join('__SEP__')
  })
    // generate dynamic ranks in sort order
    .map((thought, i) => ({ ...thought, rank: i }))

  return contextsSorted
}

export default getContextsSortedAndRanked
