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

  // first child
  const i = aboveMeta || state.showHiddenThoughts
    ? 0
    : children.findIndex(child => !isFunction(child.value))

  // between last metaprogramming attribute and first visible child
  if (i === 0) return children[0].rank - 1

  const nextChild = children[i]
  const prevChild = children[i - 1]

  return (prevChild.rank + nextChild.rank) / 2
}

export default getPrevRank
