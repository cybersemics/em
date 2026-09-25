import _ from 'lodash'
import State from '../@types/State'
import Thought from '../@types/Thought'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isRoot from '../util/isRoot'
import isVisibleContext from '../util/isVisibleContext'
import nonNull from '../util/nonNull'
import parentOf from '../util/parentOf'
import unroot from '../util/unroot'
import childIdsToThoughts from './childIdsToThoughts'
import rootedParentOf from './rootedParentOf'
import thoughtToPath from './thoughtToPath'

// sort missing thoughts to end
const MISSING_TOKEN = `${String.fromCharCode(Number.MAX_SAFE_INTEGER)}__MISSING__`

/** Gets all contexts that the given thought is in, sorted and ranked. */
const getContextsSortedAndRanked = (state: State, value: string): Thought[] => {
  const contexts = getContexts(state, value)
    .filter(id => isVisibleContext(state, id))
    .map(cxid => getThoughtById(state, cxid))
    .filter(nonNull)

  /** Calculates a lexically sortable hash from a thought. */
  const lexicalHash = (thought: Thought) => {
    const simplePath = thoughtToPath(state, thought.id)
    if (simplePath.length > 1 && isRoot([simplePath[0]])) return MISSING_TOKEN
    const path = unroot(simplePath)
    const breadcrumbs = rootedParentOf(state, parentOf(path))
    const parent = getThoughtById(state, thought.parentId)
    // Root token values are provider implementation details. Treat the root as an empty breadcrumb so
    // context order does not change between providers that use different root ids.
    const breadcrumbThoughts = isRoot(breadcrumbs) ? [] : childIdsToThoughts(state, breadcrumbs)
    if (!breadcrumbThoughts.every(nonNull)) return MISSING_TOKEN
    const encodedBreadcrumbs = breadcrumbThoughts
      .map(thought => (thought ? thought.value : MISSING_TOKEN))
      .join('\x00SEP2')
    // for contexts that have the same ancestors, we need to sort by the rendered value (parent.value)
    // use SEP1 to ensure the value is sorted ahead of the breadcrumbs separator SEP2
    return [encodedBreadcrumbs, parent?.value || ''].join('\x00SEP1')
  }

  // sort by hashed ancestor values
  const contextsSorted: Thought[] = _.sortBy(contexts, lexicalHash)
    // generate dynamic ranks in sort order
    .map((thought, i) => ({ ...thought, rank: i }))

  return contextsSorted
}

export default getContextsSortedAndRanked
