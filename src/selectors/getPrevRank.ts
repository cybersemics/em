import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { getChildrenRanked } from '../selectors/getChildren'
import isAttribute from '../util/isAttribute'

/** Gets a new rank that comes before the first child of a thought. */
// TODO: Take context not path
const getPrevRank = (state: State, id: ThoughtId, { aboveMeta }: { aboveMeta?: boolean } = {}) => {
  const children = id ? getChildrenRanked(state, id) : []

  // no children
  if (children.length === 0) return 0

  const aboveHiddenThoughts = aboveMeta || state.showHiddenThoughts

  const firstVisibleChildrenIndex = children.findIndex(child => !isAttribute(child.value))

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
