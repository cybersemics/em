import { store } from '../store.js'

// util
import {
  contextOf,
  headRank,
  headValue,
  getRankAfter,
  nextSibling,
  restoreSelection,
  rootedContextOf,
} from '../util.js'

export const moveThoughtDown = () => (dispatch) => {
  const { cursor } = store.getState()

  if (cursor) {

    const context = contextOf(cursor)
    const value = headValue(cursor)
    const rank = headRank(cursor)

    const nextThought = nextSibling(value, rootedContextOf(cursor), rank)
    if (nextThought) {

      // store selection offset before existingThoughtMove is dispatched
      const offset = window.getSelection().focusOffset

      const rankNew = getRankAfter(context.concat(nextThought))
      const newPath = context.concat({
        value,
        rank: rankNew
      })

      dispatch({
        type: 'existingThoughtMove',
        oldPath: cursor,
        newPath
      })

      restoreSelection(newPath, { offset })
    }
  }
}
