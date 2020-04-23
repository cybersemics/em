import { store } from '../store'

// action-creators
import { error } from './error'

// util
import {
  contextOf,
  ellipsize,
  getNextRank,
  headRank,
  headValue,
  isEM,
  isRoot,
  meta,
  pathToContext,
  prevSibling,
  rootedContextOf,
} from '../util'

/** Returns a function that calls the given function once then returns the same result forever */
function perma(f) {
  let result = null // eslint-disable-line fp/no-let
  return (...args) => result || (result = f(...args))
}

export const indent = () => dispatch => {
  const { cursor } = store.getState()
  const prev = perma(() => prevSibling(headValue(cursor), rootedContextOf(cursor), headRank(cursor)))
  if (cursor && prev()) {

    // cancel if cursor is EM_TOKEN or ROOT_TOKEN
    if (isEM(cursor) || isRoot(cursor)) {
      error(`The "${isEM(cursor) ? 'em' : 'home'} context" may not be indented.`)
      return
    }
    // cancel if parent is readonly or unextendable
    else if (meta(pathToContext(contextOf(cursor))).readonly) {
      error(`"${ellipsize(headValue(contextOf(cursor)))}" is read-only so "${headValue(cursor)}" may not be indented.`)
      return
    }
    else if (meta(pathToContext(contextOf(cursor))).unextendable) {
      error(`"${ellipsize(headValue(contextOf(cursor)))}" is unextendable so "${headValue(cursor)}" may not be indented.`)
      return
    }

    // store selection offset before existingThoughtMove is dispatched
    const offset = window.getSelection().focusOffset

    const cursorNew = contextOf(cursor).concat(prev(), {
      value: headValue(cursor),
      rank: getNextRank(contextOf(cursor).concat(prev()))
    })

    dispatch({
      type: 'existingThoughtMove',
      oldPath: cursor,
      newPath: cursorNew,
      offset
    })
  }
}
