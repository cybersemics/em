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
  sigKey,
  sigRank,
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
      const itemsRanked = lastItemsFromContextChain(contextChain)
      const children = getChildrenWithRank(itemsRanked)

      if (sigKey(cursor) === '' && children.length === 0) {
        deleteItem()
      }
      else if (offset === 0 && !showContexts) {
        const key = sigKey(cursor)
        const rank = sigRank(cursor)
        const items = unrank(itemsRanked)
        const context = items.length > 1 ? contextOf(items) : [ROOT_TOKEN]
        const prev = prevSibling(key, rootedContextOf(cursor), rank)

        if (prev) {

          const keyNew = prev.key + key
          const itemsRankedPrevNew = contextOf(itemsRanked).concat({
            key: keyNew,
            rank: prev.rank
          })

          store.dispatch({
            type: 'existingItemChange',
            oldValue: prev.key,
            newValue: keyNew,
            context,
            itemsRanked: contextOf(itemsRanked).concat(prev)
          })

          // merge children into merged thought
          children.forEach(child => {
            store.dispatch({
              type: 'existingItemMove',
              oldItemsRanked: itemsRanked.concat(child),
              newItemsRanked: itemsRankedPrevNew.concat(child)
            })
          })

          store.dispatch({
            type: 'existingItemDelete',
            rank,
            itemsRanked: unroot(itemsRanked)
          })

          // restore selection
          if (!isMobile || editing) {
            asyncFocus.enable()
            restoreSelection(itemsRankedPrevNew, { offset: prev.key.length })
          }
          else {
            store.dispatch({ type: 'setCursor', itemsRanked: itemsRankedPrevNew })
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
