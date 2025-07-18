import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import getNextRank from '../selectors/getNextRank'
import getRankBefore from '../selectors/getRankBefore'
import getThoughtBefore from '../selectors/getThoughtBefore'
import prevSibling from '../selectors/prevSibling'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'

/** Swaps the thought with its previous siblings. */
const moveThoughtUp = (state: State): State => {
  const { cursor } = state

  if (!cursor) return state

  const thoughtId = head(cursor)
  const pathParent = parentOf(cursor)
  const parentId = head(pathParent)

  const prevThought = prevSibling(state, cursor)

  // Identify the previous uncle thought and its path (if any).
  const prevUncleThought = pathParent.length > 0 ? getThoughtBefore(state, simplifyPath(state, pathParent)) : null
  const prevUnclePath = prevUncleThought ? appendToPath(parentOf(pathParent), prevUncleThought.id) : null

  // Determine if this move crosses contexts (no previous sibling, moving to previous uncle) and occurs within a Table View.
  // The skipMoveAnimation flag has been removed from Redux state. Animation skipping is now computed locally in the UI.

  if (!prevThought && !prevUnclePath) return state

  // metaprogramming functions that prevent moving
  if (findDescendant(state, thoughtId, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursor) ?? 'MISSING_THOUGHT')}" is read-only and cannot be moved.`,
    })
  } else if (findDescendant(state, thoughtId, '=immovable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursor) ?? 'MISSING_THOUGHT')}" is immovable.`,
    })
  } else if (findDescendant(state, parentId, '=readonly')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" are read-only and cannot be moved.`,
    })
  } else if (findDescendant(state, parentId, '=immovable')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" are immovable.`,
    })
  }

  // get selection offset before moveThought is dispatched
  const offset = selection.offset()

  const rankNew = prevThought
    ? // previous thought
      getRankBefore(state, simplifyPath(state, pathParent).concat(prevThought.id) as SimplePath)
    : // first thought in previous uncle
      getNextRank(state, head(prevUnclePath!))

  const newPathParent = prevThought ? pathParent : prevUnclePath!
  const newPath = appendToPath(newPathParent, head(cursor))

  const movedState = moveThought(state, {
    oldPath: cursor,
    newPath,
    ...(offset != null ? { offset } : null),
    newRank: rankNew,
  })

  return movedState
}

/** Action-creator for moveThoughtUp. */
export const moveThoughtUpActionCreator = (): Thunk => dispatch => dispatch({ type: 'moveThoughtUp' })

export default moveThoughtUp

// Register this action's metadata
registerActionMetadata('moveThoughtUp', {
  undoable: true,
})
