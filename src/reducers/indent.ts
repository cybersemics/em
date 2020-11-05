import { alert, existingThoughtMove } from '../reducers'
import { getNextRank, hasChild, prevSibling } from '../selectors'
import { State } from '../util/initialState'

// util
import {
  parentOf,
  ellipsize,
  headRank,
  headValue,
  isEM,
  isRoot,
  pathToContext,
  rootedParentOf,
} from '../util'

/** Increases the indentation level of the thought, i.e. Moves it to the end of its previous sibling. */
const indent = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const prev = prevSibling(state, headValue(cursor), pathToContext(rootedParentOf(cursor)), headRank(cursor))

  if (!prev) return state

  // cancel if cursor is EM_TOKEN or ROOT_TOKEN
  if (isEM(cursor) || isRoot(cursor)) {
    return alert(state, { value: `The "${isEM(cursor) ? 'em' : 'home'} context" may not be indented.` })
  }
  // cancel if parent is readonly or unextendable
  else if (hasChild(state, pathToContext(parentOf(cursor)), '=readonly')) {
    return alert(state, { value: `"${ellipsize(headValue(parentOf(cursor)))}" is read-only so "${headValue(cursor)}" may not be indented.` })
  }
  else if (hasChild(state, pathToContext(parentOf(cursor)), '=uneditable')) {
    return alert(state, { value: `"${ellipsize(headValue(parentOf(cursor)))}" is unextendable so "${headValue(cursor)}" may not be indented.` })
  }

  // store selection offset before existingThoughtMove is dispatched
  const offset = window.getSelection()?.focusOffset

  const cursorNew = parentOf(cursor).concat(
    {
      // only use value and rank
      value: prev.value,
      rank: prev.rank
    },
    {
      value: headValue(cursor),
      rank: getNextRank(state, pathToContext(parentOf(cursor).concat(prev)))
    }
  )

  return existingThoughtMove(state, {
    oldPath: cursor,
    newPath: cursorNew,
    offset
  })
}

export default indent
