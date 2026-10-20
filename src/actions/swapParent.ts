import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import moveThought from '../actions/moveThought'
import sort from '../actions/sort'
import { getChildrenRanked } from '../selectors/getChildren'
import getPreviousSiblingId from '../selectors/getPreviousSiblingId'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import alert from './alert'
import setCursor from './setCursor'

/** Swaps the current cursor's thought with its parent by moving nodes. */
const swapParent = (state: State, _payload: undefined = undefined, transaction?: ThoughtspaceTransaction): State => {
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

  // The parent replaces the child among the siblings that will move underneath it.
  const parentChildren = getChildrenRanked(state, parentId)
  const childrenUnderChild = parentChildren.map(child => (child.id === childId ? parentThought : child))

  const grandparent = parentOf(parent)
  const grandparentId = head(rootedParentOf(state, parent))

  return reducerFlow([
    // First move the child to replace its parent's position
    moveThought({
      oldPath: simplifyPath(state, cursor),
      newPath: simplifyPath(state, parent),
      afterId: getPreviousSiblingId(state, parentId),
      skipMerge: true,
    }),

    // Stable predecessor IDs preserve the order even though each move immediately normalizes ranks.
    ...childrenUnderChild.map((child, index) =>
      moveThought({
        oldPath: simplifyPath(state, child.id === parentId ? parent : [...parent, child.id]),
        newPath: simplifyPath(state, [...grandparent, childId, child.id]),
        afterId: index === 0 ? (childChildren.at(-1)?.id ?? null) : childrenUnderChild[index - 1].id,
        skipMerge: true,
      }),
    ),

    // Move grandchildren under the parent's new position
    ...childChildren.map((grandchild, index) =>
      moveThought({
        oldPath: simplifyPath(state, [...cursor, grandchild.id]),
        newPath: simplifyPath(state, [...grandparent, childId, parentId, grandchild.id]),
        afterId: childChildren[index - 1]?.id ?? null,
        skipMerge: true,
      }),
    ),

    // If an active sort preference exists on the grandparent context (e.g. the root), re-rank its
    // children so that the child thought that just moved in gets the correct rank.
    // No-op when no sort preference is active (sort returns early for type === 'None').
    sort(grandparentId),

    // If an active sort preference migrated to the child (e.g. =sort was a sibling of the child
    // under the original parent and is now a sibling of the moved parent under the child), re-rank
    // the child's new children to match the sort order.
    // No-op when no sort preference is active (sort returns early for type === 'None').
    sort(childId),

    // Keep cursor on the child at its new position
    setCursor({
      path: [...grandparent, childId],
      offset: childThought.value.length,
    }),
  ])(state, transaction)
}

/** Action-creator for swapParent. */
export const swapParentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapParent' })

export default command(swapParent)

// Register this action's metadata
registerActionMetadata('swapParent', {
  undoable: true,
})
