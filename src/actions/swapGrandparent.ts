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
import headId from '../util/headId'
import keyValueBy from '../util/keyValueBy'
import parentOf from '../util/parentOf'
import { isContextStep } from '../util/pathStep'
import reducerFlow from '../util/reducerFlow'
import alert from './alert'
import setCursor from './setCursor'

/**
 * Swaps the current cursor's thought with its grandparent by moving nodes. The two thoughts exchange places in the
 * tree and each adopts the other's children, while the parent in between keeps its position under the cursor thought.
 */
const swapGrandparent = (state: State): State => {
  const { cursor } = state

  // If there is no cursor, do nothing.
  if (!cursor) return state

  const parent = parentOf(cursor)
  const grandparent = parentOf(parent)

  // If the cursor has no grandparent, do nothing.
  if (!grandparent.length) return state

  // disallow swapGrandparent in context view
  if (
    isContextStep(head(grandparent)) ||
    isContextStep(head(parent)) ||
    isContextStep(head(cursor)) ||
    isContextViewActive(state, cursor)
  ) {
    return alert(state, { value: 'Swap Grandparent cannot be performed in the context view.' })
  }

  const childId = headId(cursor)
  const parentId = headId(parent)
  const grandparentId = headId(grandparent)

  const childThought = getThoughtById(state, childId)
  const parentThought = getThoughtById(state, parentId)
  const grandparentThought = getThoughtById(state, grandparentId)
  if (!childThought || !parentThought || !grandparentThought) return state

  // The child and the grandparent exchange their entire children lists: every child of the grandparent (the parent
  // and the parent's siblings) moves under the child, and every child of the child moves under the grandparent.
  const childChildren = getChildrenRanked(state, childId)
  const grandparentChildren = getChildrenRanked(state, grandparentId)
  const uncles = grandparentChildren.filter(uncle => uncle.id !== parentId)

  // The grandparent's children arrive under the child before the child's own children have left it, so giving them
  // the ranks they held under the grandparent can collide with the ranks already in place. moveThought reranks a
  // context whose ranks collide, and rerank resolves an exact tie in whatever order the tied thoughts happen to
  // enumerate, reordering thoughts the swap should have left alone (#5058). Ranking them past everything the child
  // currently holds keeps them clear of it, and once the child's own children have moved out, all that remains is
  // their order relative to each other. The reverse move needs no such offset: the grandparent has been emptied by
  // the time the child's children arrive, so they keep the ranks they already had.
  const ranksUnderChild = keyValueBy(grandparentChildren, (grandparentChild, i) => ({
    [grandparentChild.id]: (childChildren.at(-1)?.rank ?? -1) + 1 + i,
  }))

  const greatGrandparent = parentOf(grandparent)
  const greatGrandparentId = headId(rootedParentOf(state, grandparent))

  return reducerFlow([
    // First move the child to replace its grandparent's position
    moveThought({
      oldPath: simplifyPath(state, cursor),
      newPath: simplifyPath(state, grandparent),
      newRank: grandparentThought.rank,
      skipMerge: true,
    }),

    // Then move the parent under the child, keeping its position among the grandparent's children.
    // This must precede moving the grandparent, which would otherwise become its own descendant.
    moveThought({
      oldPath: simplifyPath(state, parent),
      newPath: simplifyPath(state, [...greatGrandparent, childId, parentId]),
      newRank: ranksUnderChild[parentId],
      skipMerge: true,
    }),

    // Then move the grandparent into the child's old position under the parent
    moveThought({
      oldPath: simplifyPath(state, grandparent),
      newPath: simplifyPath(state, [...greatGrandparent, childId, parentId, grandparentId]),
      newRank: childThought.rank,
      skipMerge: true,
    }),

    // Move the parent's siblings under the child, since the child now occupies the grandparent's position
    ...uncles.map(uncle =>
      moveThought({
        oldPath: simplifyPath(state, [...grandparent, uncle.id]),
        newPath: simplifyPath(state, [...greatGrandparent, childId, uncle.id]),
        newRank: ranksUnderChild[uncle.id],
        skipMerge: true,
      }),
    ),

    // Move the child's children under the grandparent's new position
    ...childChildren.map(grandchild =>
      moveThought({
        oldPath: simplifyPath(state, [...cursor, grandchild.id]),
        newPath: simplifyPath(state, [...greatGrandparent, childId, parentId, grandparentId, grandchild.id]),
        newRank: grandchild.rank,
        skipMerge: true,
      }),
    ),

    // Re-rank every context whose children changed. Each of the four either has a thought moved into it that
    // inherited the rank of the thought it replaced (the child under the great-grandparent, the grandparent under the
    // parent), or receives a whole set of children alongside the =sort that governs them, which arrives partway
    // through the set and re-ranks only the thoughts moved after it. Either way the resulting ranks do not match the
    // sort preference. No-op when no sort preference is active (sort returns early for type === 'None').
    sort(greatGrandparentId),
    sort(parentId),
    sort(childId),
    sort(grandparentId),

    // Keep cursor on the child at its new position
    setCursor({
      path: [...greatGrandparent, childId],
      offset: childThought.value.length,
    }),
  ])(state)
}

/** Action-creator for swapGrandparent. */
export const swapGrandparentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapGrandparent' })

export default _.curryRight(swapGrandparent)

// Register this action's metadata
registerActionMetadata('swapGrandparent', {
  undoable: true,
})
