import { alert, moveThought } from '../reducers'
import { getRankAfter, hasChild, rootedParentOf, simplifyPath } from '../selectors'
import { Path, State } from '../@types'
import { ellipsize, head, headValue, isEM, isRoot, parentOf, pathToContext, unroot } from '../util'
import * as selection from '../device/selection'

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
  else if (hasChild(state, pathToContext(state, parentOf(cursor)), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)))}" is read-only so "${headValue(
        state,
        cursor,
      )}" may not be de-indented.`,
    })
  } else if (hasChild(state, pathToContext(state, parentOf(cursor)), '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)))}" is unextendable so "${headValue(
        state,
        cursor,
      )}" may not be de-indented.`,
    })
  }

  // store selection offset before moveThought is dispatched
  const offset = selection.offset()

  const cursorNew: Path = [...unroot(rootedParentOf(state, parentOf(cursor))), head(cursor)]

  return moveThought(state, {
    oldPath: cursor,
    newPath: cursorNew,
    ...(offset != null ? { offset } : null),
    newRank: getRankAfter(state, parentOf(simplifyPath(state, cursor))),
  })
}

export default outdent
