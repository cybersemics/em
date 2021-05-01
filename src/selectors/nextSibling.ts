import { getChildrenSorted } from '../selectors'
import { equalThoughtRanked, equalThoughtSorted } from '../util'
import { State } from '../util/initialState'
import { Context } from '../types'
import isSortPreferenceAlphabetical from './isSortPreferenceAlphabetical'

/** Gets thoughts's next sibling with its rank. */
const nextSibling = (state: State, value: string, context: Context, rank: number) => {
  const siblings = getChildrenSorted(state, context)
  const i = siblings.findIndex(child => isSortPreferenceAlphabetical(state, context) ? equalThoughtSorted(child, { value, rank }) :
    equalThoughtRanked(child, { value, rank }))

  return siblings[i + 1]
}

export default nextSibling
