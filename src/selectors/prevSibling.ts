import { getContextsSortedAndRanked, getSortPreference, getThoughtsRanked, getThoughtsSorted, hasChild, isContextViewActive } from '../selectors'
import { head, isFunction } from '../util'
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

  /** Returns true when context is not hidden due to being a function or having a =hidden attribute. */
  const isVisibleContext = (context: Context) => showHiddenThoughts || (
    !isFunction(head(context)) &&
    head(context) !== '=hidden'
  )

  /** Returns true when thought is not hidden due to being a function or having a =hidden attribute. */
  const isVisible = (child: Child) => showHiddenThoughts || (
    !isFunction(child.value) &&
    !hasChild(state, [...context, child.value], '=hidden')
  )

  siblings.find(child => {
    if (child.rank === rank && (contextViewActive || child.value === value)) {
      return true
    }
    else if (!(contextViewActive ? isVisibleContext(child.context) : isVisible(child as Child))) {
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
