import Path from '../@types/Path'
import State from '../@types/State'
import * as selection from '../device/selection'
import alert from '../reducers/alert'
import moveThought from '../reducers/moveThought'
import findDescendant from '../selectors/findDescendant'
import getRankAfter from '../selectors/getRankAfter'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import unroot from '../util/unroot'

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
  }

  // calculate offset value based upon selection node before moveThought is dispatched
  const offset = (selection.isText() ? selection.offset() || 0 : state.cursorOffset) || 0

  const cursorNew: Path = [...unroot(rootedParentOf(state, parentOf(cursor))), head(cursor)]

  return moveThought(state, {
    oldPath: cursor,
    newPath: cursorNew,
    ...(offset != null ? { offset } : null),
    newRank: getRankAfter(state, parentOf(simplifyPath(state, cursor))),
  })
}

export default outdent
