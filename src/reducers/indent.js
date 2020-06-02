// util
import {
  contextOf,
  ellipsize,
  headRank,
  headValue,
  isEM,
  isRoot,
  pathToContext,
  perma,
  rootedContextOf,
} from '../util'

// selectors
import { getNextRank, meta, prevSibling } from '../selectors'

// reducers
import error from './error'
import existingThoughtMove from './existingThoughtMove'

/** Increases the indentation level of the thought, i.e. Moves it to the end of its previous sibling. */
export default state => {
  const { cursor } = state
  const prev = perma(() => prevSibling(state, headValue(cursor), rootedContextOf(cursor), headRank(cursor)))

  if (!cursor || !prev()) return state

  // cancel if cursor is EM_TOKEN or ROOT_TOKEN
  if (isEM(cursor) || isRoot(cursor)) {
    return error(state, { value: `The "${isEM(cursor) ? 'em' : 'home'} context" may not be indented.` })
  }
  // cancel if parent is readonly or unextendable
  else if (meta(state, pathToContext(contextOf(cursor))).readonly) {
    return error(state, { value: `"${ellipsize(headValue(contextOf(cursor)))}" is read-only so "${headValue(cursor)}" may not be indented.` })
  }
  else if (meta(state, pathToContext(contextOf(cursor))).unextendable) {
    return error(state, { value: `"${ellipsize(headValue(contextOf(cursor)))}" is unextendable so "${headValue(cursor)}" may not be indented.` })
  }

  // store selection offset before existingThoughtMove is dispatched
  const offset = window.getSelection().focusOffset

  const cursorNew = contextOf(cursor).concat(
    {
      // only use value and rank
      value: prev().value,
      rank: prev().rank
    },
    {
      value: headValue(cursor),
      rank: getNextRank(state, contextOf(cursor).concat(prev()))
    }
  )

  return existingThoughtMove(state, {
    oldPath: cursor,
    newPath: cursorNew,
    offset
  })
}
