import { error, existingThoughtMove } from '../reducers'
import { getNextRank, hasChild, prevSibling } from '../selectors'
import { State } from '../util/initialState'

// util
import {
  contextOf,
  ellipsize,
  headRank,
  headValue,
  isEM,
  isRoot,
  pathToContext,
  rootedContextOf,
} from '../util'

/** Increases the indentation level of the thought, i.e. Moves it to the end of its previous sibling. */
const indent = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const prev = prevSibling(state, headValue(cursor), pathToContext(rootedContextOf(cursor)), headRank(cursor))

  if (!prev) return state

  // cancel if cursor is EM_TOKEN or ROOT_TOKEN
  if (isEM(cursor) || isRoot(cursor)) {
    return error(state, { value: `The "${isEM(cursor) ? 'em' : 'home'} context" may not be indented.` })
  }
  // cancel if parent is readonly or unextendable
  else if (hasChild(state, pathToContext(contextOf(cursor)), '=readonly')) {
    return error(state, { value: `"${ellipsize(headValue(contextOf(cursor)))}" is read-only so "${headValue(cursor)}" may not be indented.` })
  }
  else if (hasChild(state, pathToContext(contextOf(cursor)), '=uneditable')) {
    return error(state, { value: `"${ellipsize(headValue(contextOf(cursor)))}" is unextendable so "${headValue(cursor)}" may not be indented.` })
  }

  // store selection offset before existingThoughtMove is dispatched
  const offset = window.getSelection()!.focusOffset

  const cursorNew = contextOf(cursor).concat(
    {
      // only use value and rank
      value: prev.value,
      rank: prev.rank
    },
    {
      value: headValue(cursor),
      rank: getNextRank(state, pathToContext(contextOf(cursor).concat(prev)))
    }
  )

  return existingThoughtMove(state, {
    oldPath: cursor,
    newPath: cursorNew,
    offset
  })
}

export default indent
