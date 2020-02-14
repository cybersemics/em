import { store } from '../store.js'

// util
import {
  getNextRank,
  contextOf,
  prevSibling,
  restoreSelection,
  rootedContextOf,
  headValue,
  headRank,
} from '../util.js'

/** Returns a function that calls the given function once then returns the same result forever */
function perma(f) {
  let result = null // eslint-disable-line fp/no-let
  return (...args) => result || (result = f(...args))
}

export const indent = () => (dispatch) => {
  const { cursor } = store.getState()
  const prev = perma(() => prevSibling(headValue(cursor), rootedContextOf(cursor), headRank(cursor)))
  if (cursor && prev()) {

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
