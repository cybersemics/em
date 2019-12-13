import { store } from '../store.js'

// util
import {
  getRankAfter,
  intersections,
  restoreSelection,
  rootedIntersections,
  sigKey,
  unroot,
} from '../util.js'

export default {
  id: 'outdent',
  name: 'De-indent',
  description: `Move the current thought to the next sibling of its context. Really should be called "dedent".`,
  keyboard: { key: 'Tab', shift: true },
  exec: e => {
    const { cursor } = store.getState()
    if (cursor && cursor.length > 1) {

      // store selection offset before existingItemMove is dispatched
      const offset = window.getSelection().focusOffset

      const cursorNew = unroot(rootedIntersections(intersections(cursor)).concat({
          key: sigKey(cursor),
          rank: getRankAfter(intersections(cursor))
        }))

      store.dispatch({
        type: 'existingItemMove',
        oldItemsRanked: cursor,
        newItemsRanked: cursorNew
      })

      restoreSelection(cursorNew, { offset })
    }
  }
}
