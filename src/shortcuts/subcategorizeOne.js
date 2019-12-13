import { store } from '../store.js'

// constants
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  intersections,
  newItem,
  signifier,
} from '../util.js'

// NOTE: The keyboard shortcut for New Uncle handled in New Item command until it is confirmed that shortcuts are evaluated in the correct order
export default {
  id: 'subcategorizeOne',
  name: 'Subcategorize One',
  description: `Insert the current thought into a new context one level up.`,
  gesture: 'lu',
  keyboard: { key: 'o', shift: true, meta: true },
  exec: e => {
    const { cursor } = store.getState()
    if (cursor) {
      const { rank } = newItem({ insertBefore: true })
      setTimeout(() => {
        store.dispatch({
          type: 'existingItemMove',
          oldItemsRanked: cursor,
          newItemsRanked: intersections(cursor).concat({ key: '', rank }, signifier(cursor))
        })
      }, RENDER_DELAY)
    }
    else {
      e.allowDefault()
    }
  }
}
