import { store } from '../store.js'

// util
import {
  getNextRank,
  contextOf,
  prevSibling,
  restoreSelection,
  rootedContextOf,
  sigKey,
  sigRank,
} from '../util.js'

/** Returns a function that calls the given function once then returns the same result forever */
function perma(f) {
  let result = null // eslint-disable-line fp/no-let
  return (...args) => result || (result = f(...args))
}

export default {
  id: 'indent',
  name: 'Indent',
  description: `Move the current thought to the end of the previous thought.`,
  keyboard: { key: 'Tab' },
  exec: e => {
    const { cursor } = store.getState()
    const prev = perma(() => prevSibling(sigKey(cursor), rootedContextOf(cursor), sigRank(cursor)))
    if (cursor && prev()) {

      // store selection offset before existingItemMove is dispatched
      const offset = window.getSelection().focusOffset

      const cursorNew = contextOf(cursor).concat(prev(), {
          key: sigKey(cursor),
          rank: getNextRank(contextOf(cursor).concat(prev()))
        })

      store.dispatch({
        type: 'existingItemMove',
        oldItemsRanked: cursor,
        newItemsRanked: cursorNew
      })

      restoreSelection(cursorNew, { offset })
    }
  }
}
