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

import { outdentSVG } from '../svgs'

export default {
  id: 'outdent',
  name: 'De-indent',
  description: `Move the current thought to the next sibling of its context. Really should be called "dedent".`,
  keyboard: { key: 'Tab', shift: true },
  svg: outdentSVG,
  exec: e => {
    const { cursor } = store.getState()
    if (cursor && cursor.length > 1) {

      // store selection offset before existingThoughtMove is dispatched
      const offset = window.getSelection().focusOffset

      const cursorNew = unroot(rootedContextOf(contextOf(cursor)).concat({
          value: headValue(cursor),
          rank: getRankAfter(contextOf(cursor))
        }))

      store.dispatch({
        type: 'existingThoughtMove',
        oldPath: cursor,
        newPath: cursorNew
      })

      restoreSelection(cursorNew, { offset })
    }
  }
}
