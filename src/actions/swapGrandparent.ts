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

/**
 * Swaps the current cursor's thought with its grandparent by moving nodes. The two thoughts exchange places in the
 * tree and each adopts the other's children, while the parent in between keeps its position under the cursor thought.
 */
const swapGrandparent = (state: State, _payload: undefined = undefined, document?: ThoughtspaceTransaction): State => {
  const { cursor } = state

  // If there is no cursor, do nothing.
  if (!cursor) return state

  const parent = parentOf(cursor)
  const grandparent = parentOf(parent)

  // If the cursor has no grandparent, do nothing.
  if (!grandparent.length) return state

  // disallow swapGrandparent in context view
  if (
    isContextViewActive(state, rootedParentOf(state, grandparent)) ||
    isContextViewActive(state, rootedParentOf(state, parent)) ||
    isContextViewActive(state, rootedParentOf(state, cursor)) ||
    isContextViewActive(state, cursor)
  ) {
    return alert(state, { value: 'Swap Grandparent cannot be performed in the context view.' })
  }

  const childId = head(cursor)
  const parentId = head(parent)
  const grandparentId = head(grandparent)

  const childThought = getThoughtById(state, childId)
  const parentThought = getThoughtById(state, parentId)
  const grandparentThought = getThoughtById(state, grandparentId)
  if (!childThought || !parentThought || !grandparentThought) return state

  // The child and the grandparent exchange their entire children lists: every child of the grandparent (the parent
  // and the parent's siblings) moves under the child, and every child of the child moves under the grandparent.
  const childChildren = getChildrenRanked(state, childId)
  const grandparentChildren = getChildrenRanked(state, grandparentId)
  const parentChildren = getChildrenRanked(state, parentId)
  const childPredecessor = parentChildren[parentChildren.findIndex(child => child.id === childId) - 1]?.id ?? null

  const greatGrandparent = parentOf(grandparent)
  const greatGrandparentId = head(rootedParentOf(state, grandparent))

  return reducerFlow([
    // First move the child to replace its grandparent's position
    moveThought({
      oldPath: simplifyPath(state, cursor),
      newPath: simplifyPath(state, grandparent),
      afterId: getPreviousSiblingId(state, grandparentId),
      skipMerge: true,
    }),

    // Move the parent and its siblings in their original order, after the child's existing children.
    // Moving the parent must precede moving the grandparent, which would otherwise become its own descendant.
    ...grandparentChildren.map((child, index) =>
      moveThought({
        oldPath: simplifyPath(state, [...grandparent, child.id]),
        newPath: simplifyPath(state, [...greatGrandparent, childId, child.id]),
        afterId: index === 0 ? (childChildren.at(-1)?.id ?? null) : grandparentChildren[index - 1].id,
        skipMerge: true,
      }),
    ),

    // Then move the grandparent into the child's old position under the parent
    moveThought({
      oldPath: simplifyPath(state, grandparent),
      newPath: simplifyPath(state, [...greatGrandparent, childId, parentId, grandparentId]),
      afterId: childPredecessor,
      skipMerge: true,
    }),

    // Move the child's children under the grandparent's new position
    ...childChildren.map((grandchild, index) =>
      moveThought({
        oldPath: simplifyPath(state, [...cursor, grandchild.id]),
        newPath: simplifyPath(state, [...greatGrandparent, childId, parentId, grandparentId, grandchild.id]),
        afterId: childChildren[index - 1]?.id ?? null,
        skipMerge: true,
      }),
    ),

    // Re-sort every context whose children changed. Each of the four either has a thought moved into the
    // position of the thought it replaced, or receives a whole set of children alongside the =sort that governs
    // them, which arrives partway through the set and sorts only the thoughts moved after it. Either way the
    // resulting order does not match the sort preference. No-op when no sort preference is active.
    sort(greatGrandparentId),
    sort(parentId),
    sort(childId),
    sort(grandparentId),

    // Keep cursor on the child at its new position
    setCursor({
      path: [...greatGrandparent, childId],
      offset: childThought.value.length,
    }),
  ])(state, document)
}

/** Action-creator for swapGrandparent. */
export const swapGrandparentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapGrandparent' })

export default command(swapGrandparent)

// Register this action's metadata
registerActionMetadata('swapGrandparent', {
  undoable: true,
})
