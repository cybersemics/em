import { getContextsSortedAndRanked, getSortPreference, getThoughtsRanked, getThoughtsSorted, isChildVisible, isContextViewActive, isContextVisible } from '../selectors'
import { head } from '../util'
import { State } from '../util/initialState'
import { Child, Context, ThoughtContext } from '../types'
import { GenericObject, Nullable } from '../utilTypes'

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
  const getThoughtSiblings = () => (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, context)

  const siblings = contextViewActive ? getContextSiblings() : getThoughtSiblings()
  let prev: Nullable<GenericObject> = null // eslint-disable-line fp/no-let
  siblings.find(child => {
    if (child.rank === rank && (contextViewActive || child.value === value)) {
      return true
    }
    else if (!(contextViewActive
      ? isContextVisible(state, child.context)
      : showHiddenThoughts || isChildVisible(state, context, child))
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
