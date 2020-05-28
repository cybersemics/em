// util
import {
  contextOf,
  ellipsize,
  headValue,
  isEM,
  isRoot,
  pathToContext,
  rootedContextOf,
  unroot,
} from '../util'

// selectors
import { getRankAfter, meta } from '../selectors'

// reducers
import error from './error'
import existingThoughtMove from './existingThoughtMove'

/** Decreases the indent level of the given thought, moving it to its parent. */
export default state => {
  const { cursor } = state
  if (!cursor || cursor.length <= 1) return state

  // Cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(contextOf(cursor)) || isRoot(contextOf(cursor))) {
    return error({ value: `Subthought of the "${isEM(contextOf(cursor)) ? 'em' : 'home'} context" may not be de-indented.` })
  }
  // cancel if parent is readonly or unextendable
  else if (meta(state, pathToContext(contextOf(cursor))).readonly) {
    return error({ value: `"${ellipsize(headValue(contextOf(cursor)))}" is read-only so "${headValue(cursor)}" may not be de-indented.` })
  }
  else if (meta(state, pathToContext(contextOf(cursor))).unextendable) {
    return error({ value: `"${ellipsize(headValue(contextOf(cursor)))}" is unextendable so "${headValue(cursor)}" may not be de-indented.` })
  }

  // store selection offset before existingThoughtMove is dispatched
  const offset = window.getSelection().focusOffset

  const cursorNew = unroot(rootedContextOf(contextOf(cursor)).concat({
    value: headValue(cursor),
    rank: getRankAfter(state, contextOf(cursor))
  }))

  return existingThoughtMove(state, {
    oldPath: cursor,
    newPath: cursorNew,
    offset
  })
}
