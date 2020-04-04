import { store } from '../store.js'

// action-creators
import { error } from './error.js'

// util
import {
  contextOf,
  ellipsize,
  getRankAfter,
  headValue,
  isEM,
  isRoot,
  meta,
  pathToContext,
  rootedContextOf,
  unroot,
} from '../util.js'

export const outdent = () => dispatch => {
  const { cursor } = store.getState()
  if (cursor && cursor.length > 1) {

    // Cancel if a direct child of EM_TOKEN or ROOT_TOKEN
    if (isEM(contextOf(cursor)) || isRoot(contextOf(cursor))) {
      error(`Subthought of the "${isEM(contextOf(cursor)) ? 'em' : 'home'} context" may not be de-indented.`)
      return
    }
    // cancel if parent is readonly or unextendable
    else if (meta(pathToContext(contextOf(cursor))).readonly) {
      error(`"${ellipsize(headValue(contextOf(cursor)))}" is read-only so "${headValue(cursor)}" may not be de-indented.`)
      return
    }
    else if (meta(pathToContext(contextOf(cursor))).unextendable) {
      error(`"${ellipsize(headValue(contextOf(cursor)))}" is unextendable so "${headValue(cursor)}" may not be de-indented.`)
      return
    }

    // store selection offset before existingThoughtMove is dispatched
    const offset = window.getSelection().focusOffset

    const cursorNew = unroot(rootedContextOf(contextOf(cursor)).concat({
      value: headValue(cursor),
      rank: getRankAfter(contextOf(cursor))
    }))

    dispatch({
      type: 'existingThoughtMove',
      oldPath: cursor,
      newPath: cursorNew,
      offset
    })
  }
}
