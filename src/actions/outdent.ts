import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import getRankAfter from '../selectors/getRankAfter'
import isContextViewActive from '../selectors/isContextViewActive'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'

/** Decreases the indent level of the given thought, moving it to its parent. */
const outdent = (state: State) => {
  const { cursor } = state
  if (!cursor || cursor.length <= 1) return state

  // Cancel if a direct child of EM_TOKEN or HOME_TOKEN
  if (isEM(parentOf(cursor)) || isRoot(parentOf(cursor))) {
    return alert(state, {
      value: `Subthought of the "${isEM(parentOf(cursor)) ? 'em' : 'home'} context" may not be de-indented.`,
    })
  }
  // cancel if parent is readonly or unextendable
  else if (findDescendant(state, head(parentOf(cursor)), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)))}" is read-only so "${headValue(
        state,
        cursor,
      )}" may not be de-indented.`,
    })
  } else if (findDescendant(state, head(parentOf(cursor)), '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)))}" is unextendable so "${headValue(
        state,
        cursor,
      )}" may not be de-indented.`,
    })
  } else if (isContextViewActive(state, parentOf(cursor))) {
    return alert(state, {
      value: `Contexts may not be de-indented in the context view.`,
    })
  } else if (isContextViewActive(state, parentOf(parentOf(cursor)))) {
    return alert(state, {
      value: `Subthoughts may not be de-indented from their context in the context view.`,
    })
  }

  // calculate offset value based upon selection node before moveThought is dispatched
  const offset = (selection.isText() ? selection.offset() || 0 : state.cursorOffset) || 0

  const cursorNew: Path = appendToPath(parentOf(parentOf(cursor)), head(cursor))

  return moveThought(state, {
    oldPath: cursor,
    newPath: cursorNew,
    ...(offset != null ? { offset } : null),
    newRank: getRankAfter(state, parentOf(simplifyPath(state, cursor))),
  })
}

/** Action-creator for outdent. */
export const outdentActionCreator = (): Thunk => dispatch => dispatch({ type: 'outdent' })

export default outdent
