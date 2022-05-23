import { getChildrenSorted, getSortPreference } from '../selectors'
import { contextToThoughtId, equalThoughtRanked, equalThoughtSorted } from '../util'
import { Context, State } from '../@types'

/** Gets the next sibling after a thought according to its parent's sort preference. */
const nextSibling = (state: State, value: string, context: Context, rank: number) => {
  const siblings = getChildrenSorted(state, context)
  const id = contextToThoughtId(state, context)
  const i = siblings.findIndex(child =>
    id && getSortPreference(state, id).type === 'Alphabetical'
      ? equalThoughtSorted(child, { value, rank })
      : equalThoughtRanked(child, { value, rank }),
  )

  return siblings[i + 1]
}

export default nextSibling
