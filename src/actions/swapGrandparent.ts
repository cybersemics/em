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
import parentOf from '../util/parentOf'
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

  // Get only direct children of the child thought (great-grandchildren of the grandparent)
  const childChildren = getChildrenRanked(state, childId)

  // Get the parent's siblings (other children of the grandparent excluding the parent)
  const uncles = getChildrenRanked(state, grandparentId).filter(uncle => uncle.id !== parentId)

  const greatGrandparent = parentOf(grandparent)
  const greatGrandparentId = head(rootedParentOf(state, grandparent))

  return reducerFlow([
    // First move the child to replace its grandparent's position
    moveThought({
      oldPath: simplifyPath(state, cursor),
      newPath: simplifyPath(state, grandparent),
      newRank: grandparentThought.rank,
      skipMerge: true,
    }),

    // Then move the parent under the child, keeping the rank it had under the grandparent.
    // This must precede moving the grandparent, which would otherwise become its own descendant.
    moveThought({
      oldPath: simplifyPath(state, parent),
      newPath: simplifyPath(state, [...greatGrandparent, childId, parentId]),
      newRank: parentThought.rank,
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
        newRank: uncle.rank,
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
