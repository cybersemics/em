import { getChildrenSortedById, getSortPreference } from '../selectors'
import { equalThoughtRanked, equalThoughtSorted } from '../util'
import { State, ThoughtId } from '../@types'

/** Gets the next sibling after a thought according to its parent's sort preference. */
const nextSibling = (state: State, parentId: ThoughtId, value: string, rank: number) => {
  const siblings = parentId ? getChildrenSortedById(state, parentId) : []
  const i = siblings.findIndex(child =>
    parentId && getSortPreference(state, parentId).type === 'Alphabetical'
      ? equalThoughtSorted(child, { value, rank })
      : equalThoughtRanked(child, { value, rank }),
  )

  return siblings[i + 1]
}

export default nextSibling
