import { store } from '../store.js'

// action-creators
import { error } from './error.js'

// util
import {
  contextOf,
  ellipsize,
  getNextRank,
  headRank,
  headValue,
  meta,
  pathToContext,
  prevSibling,
  restoreSelection,
  rootedContextOf,
} from '../util.js'

/** Returns a function that calls the given function once then returns the same result forever */
function perma(f) {
  let result = null // eslint-disable-line fp/no-let
  return (...args) => result || (result = f(...args))
}

export const indent = () => dispatch => {
  const { cursor } = store.getState().present
  const prev = perma(() => prevSibling(headValue(cursor), rootedContextOf(cursor), headRank(cursor)))
  if (cursor && prev()) {

    // cancel if parent is readonly or unextendable
    if (meta(pathToContext(contextOf(cursor))).readonly) {
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
      newPath: cursorNew
    })

    restoreSelection(cursorNew, { offset })
  }
}
