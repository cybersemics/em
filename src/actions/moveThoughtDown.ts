import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import getPrevRank from '../selectors/getPrevRank'
import getRankAfter from '../selectors/getRankAfter'
import nextSibling from '../selectors/nextSibling'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'

/** Swaps the thought with its next siblings. */
const moveThoughtDown = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const thoughtId = head(cursor)
  const pathParent = parentOf(cursor)
  const parentId = head(pathParent)
  const nextThought = nextSibling(state, cursor)

  // if the cursor is the last child, move the thought to the beginning of its next uncle
  const nextUncleThought = pathParent.length > 0 ? nextSibling(state, pathParent) : null
  const nextUnclePath = nextUncleThought ? appendToPath(parentOf(pathParent), nextUncleThought.id) : null

  if (!nextThought && !nextUnclePath) return state

  if (findDescendant(state, thoughtId, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursor))}" is read-only and cannot be moved.`,
    })
  } else if (findDescendant(state, thoughtId, '=immovable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursor))}" is immovable.`,
    })
  } else if (findDescendant(state, parentId, '=readonly')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(state, parentOf(cursor)))}" are read-only and cannot be moved.`,
    })
  } else if (findDescendant(state, parentId, '=immovable')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(state, parentOf(cursor)))}" are immovable.`,
    })
  }

  // store selection offset before moveThought is dispatched
  const offset = selection.offset()

  const rankNew = nextThought
    ? // next thought
      getRankAfter(state, simplifyPath(state, pathParent).concat(nextThought.id) as SimplePath)
    : // first thought in next uncle
      getPrevRank(state, head(nextUnclePath!))

  const newPathParent = nextThought ? pathParent : nextUnclePath!
  const newPath = appendToPath(newPathParent, head(cursor))

  return moveThought(state, {
    oldPath: cursor,
    newPath,
    ...(offset != null ? { offset } : null),
    newRank: rankNew,
  })
}

/** Action-creator for moveThoughtDown. */
export const moveThoughtDownActionCreator = (): Thunk => dispatch => dispatch({ type: 'moveThoughtDown' })

export default moveThoughtDown
