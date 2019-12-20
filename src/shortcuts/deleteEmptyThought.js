import { isMobile } from '../browser.js'
import { store } from '../store.js'

// constants
import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import {
  asyncFocus,
  deleteThought,
  getThoughts,
  contextOf,
  isContextViewActive,
  lastThoughtsFromContextChain,
  prevSibling,
  restoreSelection,
  rootedContextOf,
  headValue,
  headRank,
  splitChain,
  pathToContext,
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
      const showContexts = isContextViewActive(contextOf(cursor), { state: store.getState() })
      const contextChain = splitChain(cursor, contextViews)
      const thoughtsRanked = lastThoughtsFromContextChain(contextChain)
      const children = getThoughts(thoughtsRanked)

      if (headValue(cursor) === '' && children.length === 0) {
        deleteThought()
      }
      else if (offset === 0 && !showContexts) {
        const value = headValue(cursor)
        const rank = headRank(cursor)
        const thoughts = pathToContext(thoughtsRanked)
        const context = thoughts.length > 1 ? contextOf(thoughts) : [ROOT_TOKEN]
        const prev = prevSibling(value, rootedContextOf(cursor), rank)

        if (prev) {

          const valueNew = prev.value + value
          const thoughtsRankedPrevNew = contextOf(thoughtsRanked).concat({
            value: valueNew,
            rank: prev.rank
          })

          store.dispatch({
            type: 'existingThoughtChange',
            oldValue: prev.value,
            newValue: valueNew,
            context,
            thoughtsRanked: contextOf(thoughtsRanked).concat(prev)
          })

          // merge children into merged thought
          children.forEach(child => {
            store.dispatch({
              type: 'existingThoughtMove',
              oldPath: thoughtsRanked.concat(child),
              newPath: thoughtsRankedPrevNew.concat(child)
            })
          })

          store.dispatch({
            type: 'existingThoughtDelete',
            rank,
            thoughtsRanked: unroot(thoughtsRanked)
          })

          // restore selection
          if (!isMobile || editing) {
            asyncFocus.enable()
            restoreSelection(thoughtsRankedPrevNew, { offset: prev.value.length })
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
