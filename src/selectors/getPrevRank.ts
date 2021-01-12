import { getChildrenRanked } from '../selectors'
import { isFunction } from '../util'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Gets a rank that comes before all visible thoughts in a context. */
// TODO: Take context not path
const getPrevRank = (state: State, context: Context, { aboveMeta }: { aboveMeta?: boolean } = {}) => {
  const children = getChildrenRanked(state, context)

  // no children
  if (children.length === 0) return 0

  const aboveHiddenThoughts = aboveMeta || state.showHiddenThoughts

  const firstVisibleChildrenIndex = children.findIndex(child => !isFunction(child.value))

  if (aboveHiddenThoughts || firstVisibleChildrenIndex === 0) return children[0].rank - 1

  // there could be no visible thoughts in the context
  const noVisibleChildren = firstVisibleChildrenIndex === -1

  // if there are no visible chilren then get rank higher than the last hidden thoughts
  if (noVisibleChildren) return children[children.length - 1].rank + 1

  const nextChild = children[firstVisibleChildrenIndex]
  const prevChild = children[firstVisibleChildrenIndex - 1]

  return (prevChild.rank + nextChild.rank) / 2
}

export default getPrevRank
