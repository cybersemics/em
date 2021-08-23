import { alert, moveThought } from '../reducers'
import { getNextRank, hasChild, rootedParentOf, prevSibling } from '../selectors'
import { State } from '../@types'
import { appendToPath, ellipsize, head, headRank, headValue, isEM, isRoot, parentOf, pathToContext } from '../util'

/** Increases the indentation level of the thought, i.e. Moves it to the end of its previous sibling. */
const indent = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const prev = prevSibling(
    state,
    headValue(cursor),
    pathToContext(state, rootedParentOf(state, cursor)),
    headRank(cursor),
  )

  if (!prev) return state

  // cancel if cursor is EM_TOKEN or HOME_TOKEN
  if (isEM(cursor) || isRoot(cursor)) {
    return alert(state, { value: `The "${isEM(cursor) ? 'em' : 'home'} context" may not be indented.` })
  }
  // cancel if parent is readonly or unextendable
  else if (hasChild(state, pathToContext(state, parentOf(cursor)), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(parentOf(cursor)))}" is read-only so "${headValue(cursor)}" may not be indented.`,
    })
  } else if (hasChild(state, pathToContext(state, parentOf(cursor)), '=uneditable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(parentOf(cursor)))}" is unextendable so "${headValue(
        cursor,
      )}" may not be indented.`,
    })
  }

  // store selection offset before moveThought is dispatched
  const offset = window.getSelection()?.focusOffset

  const cursorNew = appendToPath(parentOf(cursor), prev.id, head(cursor))

  return moveThought(state, {
    oldPath: cursor,
    newPath: cursorNew,
    offset,
    newRank: getNextRank(state, pathToContext(state, appendToPath(parentOf(cursor), prev.id))),
  })
}

export default indent
