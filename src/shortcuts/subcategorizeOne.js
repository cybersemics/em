import { store } from '../store.js'

// constants
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  contextOf,
  newThought,
  head,
} from '../util.js'

import { subcategorizeOneSVG } from '../svgs'

// NOTE: The keyboard shortcut for New Uncle handled in New Thought command until it is confirmed that shortcuts are evaluated in the correct order
export default {
  id: 'subcategorizeOne',
  name: 'Subcategorize One',
  description: `Insert the current thought into a new context one level up.`,
  gesture: 'lu',
  keyboard: { key: 'o', shift: true, meta: true },
  svg: subcategorizeOneSVG,
  exec: e => {
    const { cursor } = store.getState()
    if (cursor) {
      const { rank } = newThought({ insertBefore: true })
      setTimeout(() => {
        store.dispatch({
          type: 'existingThoughtMove',
          oldPath: cursor,
          newPath: contextOf(cursor).concat({ value: '', rank }, head(cursor))
        })
      }, RENDER_DELAY)
    }
    else {
      e.allowDefault()
    }
  }
}
