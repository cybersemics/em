import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import moveThought from '../actions/moveThought'
import sort from '../actions/sort'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import keyValueBy from '../util/keyValueBy'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import alert from './alert'
import setCursor from './setCursor'

/** Swaps the current cursor's thought with its parent by moving nodes. */
const swapParent = (state: State): State => {
  const { cursor } = state

  // If there is no cursor, do nothing.
  if (!cursor) return state

  // disallow swapParent in context view
  if (
    isContextViewActive(state, rootedParentOf(state, cursor)) ||
    isContextViewActive(state, rootedParentOf(state, parentOf(cursor))) ||
    isContextViewActive(state, cursor)
  ) {
    return alert(state, { value: 'Swap Parent cannot be performed in the context view.' })
  }

  // Get the parent path directly from the cursor
  const parent = parentOf(cursor)

  // If the cursor is at the root, do nothing.
  if (!parent.length) return state

  const childId = head(cursor)
  const parentId = head(parent)

  const childThought = getThoughtById(state, childId)
  const parentThought = getThoughtById(state, parentId)
  if (!childThought || !parentThought) return state

  // Get only direct children of the child thought (grandchildren)
  const childChildren = getChildrenRanked(state, childId)

  // Get siblings (other children of parent excluding the child being swapped)
  const parentChildren = getChildrenRanked(state, parentId)

  // Meta attributes describe the thought they belong to (e.g. =favorite, =note, =pin, =sort), so they stay with their
  // own thought rather than being exchanged along with the regular children.
  const grandchildren = childChildren.filter(grandchild => !isAttribute(grandchild.value))
  const siblings = parentChildren.filter(sibling => sibling.id !== childId && !isAttribute(sibling.value))
  const parentAttributes = parentChildren.filter(parentChild => isAttribute(parentChild.value))

  // The parent and the siblings arrive under the child before the child's own children have left it, so giving them
  // the ranks they held under the parent can collide with the ranks already in place. moveThought reranks a context
  // whose ranks collide, and rerank resolves an exact tie in whatever order the tied thoughts happen to enumerate,
  // reordering thoughts the swap should have left alone. Ranking them past everything the child currently holds keeps
  // them clear of it, and once the child's own children have moved out, all that remains is their order relative to
  // each other — the parent taking the slot the child vacated. The reverse move needs the same offset, since the
  // parent keeps its own meta attributes while the child's children arrive.
  const ranksUnderChild = keyValueBy(parentChildren, (parentChild, i) => ({
    [parentChild.id === childId ? parentId : parentChild.id]: (childChildren.at(-1)?.rank ?? -1) + 1 + i,
  }))
  const ranksUnderParent = keyValueBy(grandchildren, (grandchild, i) => ({
    [grandchild.id]: (parentAttributes.at(-1)?.rank ?? -1) + 1 + i,
  }))

  const grandparent = parentOf(parent)
  const grandparentId = head(rootedParentOf(state, parent))

  return reducerFlow([
    // First move the child to replace its parent's position
    moveThought({
      oldPath: simplifyPath(state, cursor),
      newPath: simplifyPath(state, parent),
      newRank: parentThought.rank,
      skipMerge: true,
    }),

    // Then move the parent under the child, into the slot the child vacated
    moveThought({
      oldPath: simplifyPath(state, parent),
      newPath: simplifyPath(state, [...grandparent, childId, parentId]),
      newRank: ranksUnderChild[parentId],
      skipMerge: true,
    }),

    // Move siblings under the child
    ...siblings.map(sibling =>
      moveThought({
        oldPath: simplifyPath(state, [...parent, sibling.id]),
        newPath: simplifyPath(state, [...grandparent, childId, sibling.id]),
        newRank: ranksUnderChild[sibling.id],
        skipMerge: true,
      }),
    ),

    // Move grandchildren under the parent's new position
    ...grandchildren.map(grandchild =>
      moveThought({
        oldPath: simplifyPath(state, [...cursor, grandchild.id]),
        newPath: simplifyPath(state, [...grandparent, childId, parentId, grandchild.id]),
        newRank: ranksUnderParent[grandchild.id],
        skipMerge: true,
      }),
    ),

    // If an active sort preference exists on the grandparent context (e.g. the root), re-rank its
    // children so that the child thought that just moved in gets the correct rank.
    // No-op when no sort preference is active (sort returns early for type === 'None').
    sort(grandparentId),

    // The child and the parent each keep their own =sort while exchanging children, so re-rank the
    // children each of them received to match its sort order.
    // No-op when no sort preference is active (sort returns early for type === 'None').
    sort(childId),
    sort(parentId),

    // Keep cursor on the child at its new position
    setCursor({
      path: [...grandparent, childId],
      offset: childThought.value.length,
    }),
  ])(state)
}

/** Action-creator for swapParent. */
export const swapParentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapParent' })

export default _.curryRight(swapParent)

// Register this action's metadata
registerActionMetadata('swapParent', {
  undoable: true,
})
