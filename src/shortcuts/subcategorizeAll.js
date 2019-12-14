import { store } from '../store.js'

// constants
import {
  RANKED_ROOT,
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  getChildrenWithRank,
  contextOf,
  lastThoughtsFromContextChain,
  newThought,
  splitChain,
} from '../util.js'

export default {
  id: 'subcategorizeAll',
  name: 'Subcategorize All',
  description: `Insert all thoughts in the current context into a new context one level up.`,
  gesture: 'ldr',
  keyboard: { key: 'l', shift: true, meta: true },
  exec: e => {
    const { contextViews, cursor } = store.getState()
    if (cursor) {
      const contextChain = splitChain(cursor, contextViews)
      const thoughtsRanked = cursor.length > 1
        ? (contextOf(contextChain.length > 1
          ? lastThoughtsFromContextChain(contextChain)
          : cursor))
        : RANKED_ROOT

      const children = getChildrenWithRank(thoughtsRanked)

      const { rank } = newThought({
        at: cursor.length > 1 ? contextOf(cursor) : RANKED_ROOT,
        insertNewChild: true,
        insertBefore: true
      })

      setTimeout(() => {
        children.forEach(child => {
          store.dispatch({
            type: 'existingThoughtMove',
            oldThoughtsRanked: contextOf(cursor).concat(child),
            newThoughtsRanked: contextOf(cursor).concat({ key: '', rank }, child)
          })
        })
      }, RENDER_DELAY)
    }
    else {
      e.allowDefault()
    }
  }
}
