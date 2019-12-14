import { isMobile } from '../browser.js'
import { store } from '../store.js'

// constants
import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import {
  asyncFocus,
  deleteItem,
  getChildrenWithRank,
  contextOf,
  isContextViewActive,
  lastItemsFromContextChain,
  prevSibling,
  restoreSelection,
  rootedContextOf,
  headKey,
  headRank,
  splitChain,
  unrank,
  unroot,
} from '../util.js'

export default {
  id: 'deleteEmptyThought',
  name: 'Delete Empty Thought',
  keyboard: { key: 'Backspace' },
  hideFromInstructions: true,
  exec: e => {
    const { cursor, contextViews, editing } = store.getState()
    const offset = window.getSelection().focusOffset

    if (cursor) {
      const showContexts = isContextViewActive(unrank(contextOf(cursor)), { state: store.getState() })
      const contextChain = splitChain(cursor, contextViews)
      const thoughtsRanked = lastItemsFromContextChain(contextChain)
      const children = getChildrenWithRank(thoughtsRanked)

      if (headKey(cursor) === '' && children.length === 0) {
        deleteItem()
      }
      else if (offset === 0 && !showContexts) {
        const key = headKey(cursor)
        const rank = headRank(cursor)
        const items = unrank(thoughtsRanked)
        const context = items.length > 1 ? contextOf(items) : [ROOT_TOKEN]
        const prev = prevSibling(key, rootedContextOf(cursor), rank)

        if (prev) {

          const keyNew = prev.key + key
          const thoughtsRankedPrevNew = contextOf(thoughtsRanked).concat({
            key: keyNew,
            rank: prev.rank
          })

          store.dispatch({
            type: 'existingItemChange',
            oldValue: prev.key,
            newValue: keyNew,
            context,
            thoughtsRanked: contextOf(thoughtsRanked).concat(prev)
          })

          // merge children into merged thought
          children.forEach(child => {
            store.dispatch({
              type: 'existingItemMove',
              oldThoughtsRanked: thoughtsRanked.concat(child),
              newThoughtsRanked: thoughtsRankedPrevNew.concat(child)
            })
          })

          store.dispatch({
            type: 'existingItemDelete',
            rank,
            thoughtsRanked: unroot(thoughtsRanked)
          })

          // restore selection
          if (!isMobile || editing) {
            asyncFocus.enable()
            restoreSelection(thoughtsRankedPrevNew, { offset: prev.key.length })
          }
          else {
            store.dispatch({ type: 'setCursor', thoughtsRanked: thoughtsRankedPrevNew })
          }

        }

      }
      else {
        e.allowDefault()
      }
    }
    else {
      e.allowDefault()
    }
  }
}
