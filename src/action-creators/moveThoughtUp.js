import { store } from '../store.js'

// util
import {
  contextOf,
  headRank,
  headValue,
  getRankBefore,
  prevSibling,
  restoreSelection,
  rootedContextOf,
} from '../util.js'

export const moveThoughtUp = () => (dispatch) => {
  const { cursor } = store.getState()

  if (cursor) {

    const context = contextOf(cursor)
    const value = headValue(cursor)
    const rank = headRank(cursor)

    const prevThought = prevSibling(value, rootedContextOf(cursor), rank)
    if (prevThought) {

      // store selection offset before existingThoughtMove is dispatched
      const offset = window.getSelection().focusOffset

      const rankNew = getRankBefore(context.concat(prevThought))
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
