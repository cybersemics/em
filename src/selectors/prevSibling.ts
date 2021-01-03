import { getContextsSortedAndRanked, getSortPreference, getChildrenRanked, getChildrenSorted, isChildVisible, isContextViewActive, isAncestorsVisible } from '../selectors'
import { head } from '../util'
import { State } from '../util/initialState'
import { Child, Context, Index, ThoughtContext } from '../types'

/**
 * Gets a context's previous sibling with its rank.
 *
 * @param context   Can be a context or path.
 */
const prevSibling = (state: State, value: string, context: Context, rank: number): Child | null => {
  const { showHiddenThoughts } = state
  const sortPreference = getSortPreference(state, context)
  const contextViewActive = isContextViewActive(state, context)

  /** Gets siblings of a context. */
  const getContextSiblings = () => getContextsSortedAndRanked(state, head(context))

  /** Gets siblings of thought. */
  const getThoughtSiblings = () => (sortPreference === 'Alphabetical' ? getChildrenSorted : getChildrenRanked)(state, context)

  const siblings = contextViewActive ? getContextSiblings() : getThoughtSiblings() as (Child | ThoughtContext)[]
  let prev: Index | null = null // eslint-disable-line fp/no-let
  siblings.find(child => {
    if (child.rank === rank && (contextViewActive || (child as Child).value === value)) {
      return true
    }
    else if (!(contextViewActive
      ? isAncestorsVisible(state, (child as ThoughtContext).context)
      : showHiddenThoughts || isChildVisible(state, context, child as Child))
    ) {
      return false
    }
    else {
      prev = child
      return false
    }
  })
  return prev && { ...prev as (ThoughtContext & Child), value: contextViewActive ? head(prev!.context) : prev!.value }
}

export default prevSibling
