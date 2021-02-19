import { alert, existingThoughtMove } from '../reducers'
import { getRankAfter, hasChild, rootedParentOf, simplifyPath } from '../selectors'
import { State } from '../util/initialState'
import { Path } from '../types'
import { ellipsize, head, headValue, isEM, isRoot, parentOf, pathToContext, unroot } from '../util'

/** Decreases the indent level of the given thought, moving it to its parent. */
const outdent = (state: State) => {
  const { cursor } = state
  if (!cursor || cursor.length <= 1) return state

  // Cancel if a direct child of EM_TOKEN or HOME_TOKEN
  if (isEM(parentOf(cursor)) || isRoot(parentOf(cursor))) {
    return alert(state, {
      value: `Subthought of the "${isEM(parentOf(cursor)) ? 'em' : 'home'} context" may not be de-indented.`
    })
  }
  // cancel if parent is readonly or unextendable
  else if (hasChild(state, pathToContext(parentOf(cursor)), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(parentOf(cursor)))}" is read-only so "${headValue(cursor)}" may not be de-indented.`
    })
  }
  else if (hasChild(state, pathToContext(parentOf(cursor)), '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(parentOf(cursor)))}" is unextendable so "${headValue(cursor)}" may not be de-indented.`
    })
  }

  // store selection offset before existingThoughtMove is dispatched
  const offset = window.getSelection()?.focusOffset

  const cursorNew: Path = [
    ...unroot(rootedParentOf(state, parentOf(cursor))),
    {
      ...head(cursor),
      rank: getRankAfter(state, parentOf(simplifyPath(state, cursor)))
    }
  ]

  return existingThoughtMove(state, {
    oldPath: cursor,
    newPath: cursorNew,
    offset
  })
}

export default outdent
