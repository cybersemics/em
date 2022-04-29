import {
  getContextsSortedAndRanked,
  getChildrenRanked,
  getChildrenSorted,
  isChildVisible,
  isContextViewActive,
  isAncestorsVisible,
  getSortPreference,
} from '../selectors'
import { head } from '../util'
import { Context, Thought, State } from '../@types'
import thoughtToContext from './thoughtToContext'

/**
 * Gets the previous sibling of a thought according to its parent's sort preference.
 */
const prevSibling = (state: State, value: string, context: Context, rank: number): Thought | null => {
  const { showHiddenThoughts } = state
  const contextViewActive = isContextViewActive(state, context)

  /** Gets siblings of a context. */
  const getContextSiblings = () => getContextsSortedAndRanked(state, head(context))

  /** Gets siblings of thought. */
  const getThoughtSiblings = () =>
    (getSortPreference(state, context).type === 'Alphabetical' ? getChildrenSorted : getChildrenRanked)(state, context)

  const siblings = contextViewActive ? getContextSiblings() : getThoughtSiblings()
  let prev = null // eslint-disable-line fp/no-let
  siblings.find(child => {
    if (child.rank === rank && (contextViewActive || child.value === value)) {
      return true
    } else if (
      !(contextViewActive
        ? isAncestorsVisible(state, thoughtToContext(state, child.id)!)
        : showHiddenThoughts || isChildVisible(state, context, child))
    ) {
      return false
    } else {
      prev = child
      return false
    }
  })
  // redeclare prev to convince typescript that the type changed after `siblings.find`
  // otherwise it assumes that `find` has no side effect`
  const prevChild = prev as Thought | null

  return prevChild
}

export default prevSibling
