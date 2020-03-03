import { store } from '../store.js'

// util
import {
  getRankAfter,
  contextOf,
  restoreSelection,
  rootedContextOf,
  headValue,
  unroot,
} from '../util.js'

export const outdent = () => dispatch => {
  const { cursor } = store.getState().present
  if (cursor && cursor.length > 1) {

    // store selection offset before existingThoughtMove is dispatched
    const offset = window.getSelection().focusOffset

    const cursorNew = unroot(rootedContextOf(contextOf(cursor)).concat({
      value: headValue(cursor),
      rank: getRankAfter(contextOf(cursor))
    }))

    dispatch({
      type: 'existingThoughtMove',
      oldPath: cursor,
      newPath: cursorNew
    })

    restoreSelection(cursorNew, { offset })
  }
}
