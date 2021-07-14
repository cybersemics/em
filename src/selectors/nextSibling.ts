import { getChildrenSorted, getSortPreference } from '../selectors'
import { equalThoughtRanked, equalThoughtSorted } from '../util'
import { Context, State } from '../@types'

/** Gets thoughts's next sibling with its rank. */
const nextSibling = (state: State, value: string, context: Context, rank: number) => {
  const siblings = getChildrenSorted(state, context)
  const i = siblings.findIndex(child =>
    getSortPreference(state, context).type === 'Alphabetical'
      ? equalThoughtSorted(child, { value, rank })
      : equalThoughtRanked(child, { value, rank }),
  )

  return siblings[i + 1]
}

export default nextSibling
