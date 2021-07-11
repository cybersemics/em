import {
  getContextsSortedAndRanked,
  getChildrenRanked,
  getChildrenSorted,
  isChildVisible,
  isContextViewActive,
  isAncestorsVisible,
  getSortPreference,
} from '../selectors'
import { createId, head } from '../util'
import { Child, Context, State, ThoughtContext } from '../@types'

/**
 * Gets a context's previous sibling with its rank.
 *
 * @param context   Can be a context or path.
 */
const prevSibling = (state: State, value: string, context: Context, rank: number): Child | null => {
  const { showHiddenThoughts } = state
  const contextViewActive = isContextViewActive(state, context)

  /** Gets siblings of a context. */
  const getContextSiblings = () => getContextsSortedAndRanked(state, head(context))

  /** Gets siblings of thought. */
  const getThoughtSiblings = () =>
    (getSortPreference(state, context).type === 'Alphabetical' ? getChildrenSorted : getChildrenRanked)(state, context)

  const siblings = contextViewActive ? getContextSiblings() : (getThoughtSiblings() as (Child | ThoughtContext)[])
  let prev = null // eslint-disable-line fp/no-let
  siblings.find(child => {
    if (child.rank === rank && (contextViewActive || (child as Child).value === value)) {
      return true
    } else if (
      !(contextViewActive
        ? isAncestorsVisible(state, (child as ThoughtContext).context)
        : showHiddenThoughts || isChildVisible(state, context, child as Child))
    ) {
      return false
    } else {
      prev = child
      return false
    }
  })
  // redeclare prev to convince typescript that the type changed after `siblings.find`
  // otherwise it assumes that `find` has no side effect`
  const prevChild = prev as ThoughtContext | Child | null
  return (
    prevChild && {
      ...prevChild,
      id: createId(),
      value: contextViewActive ? head((prevChild as ThoughtContext).context) : (prevChild as Child).value,
    }
  )
}

export default prevSibling
