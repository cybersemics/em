import { store } from '../store.js'

// util
import {
  contextOf,
  headRank,
  headValue,
  getRankAfter,
  nextSibling,
  restoreSelection,
} from '../util.js'

export default {
    id: 'moveThoughtDown',
    name: 'Move Thought Down',
    description: 'Move the current thought down.',
    keyboard: { key: 'ArrowDown', meta: true, shift: true },
    exec: () => {
      const { cursor } = store.getState()

      if (cursor) {

        const context = contextOf(cursor)
        const value = headValue(cursor)
        const rank = headRank(cursor)

        const nextThought = nextSibling(value, context, rank)
        if (nextThought) {

          // store selection offset before existingThoughtMove is dispatched
          const offset = window.getSelection().focusOffset

          const rankNew = getRankAfter(context.concat(nextThought))
          const newPath = context.concat({
            value,
            rank: rankNew
          })

          store.dispatch({
            type: 'existingThoughtMove',
            oldPath: cursor,
            newPath
          })

          restoreSelection(newPath, { offset })
        }
      }
    }
  }
