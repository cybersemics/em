import { getChildrenSorted } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import equalThoughtRanked from '../util/equalThoughtRanked'
import equalThoughtSorted from '../util/equalThoughtSorted'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'

/** Gets the next sibling after a thought according to its parent's sort preference. */
const nextSibling = (state: State, parentId: ThoughtId, value: string, rank: number) => {
  const siblings = parentId ? getChildrenSorted(state, parentId) : []
  const i = siblings.findIndex(child =>
    parentId && getSortPreference(state, parentId).type === 'Alphabetical'
      ? equalThoughtSorted(child, { value, rank })
      : equalThoughtRanked(child, { value, rank }),
  )

  return siblings[i + 1]
}

export default nextSibling
