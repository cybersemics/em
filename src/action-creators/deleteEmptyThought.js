import { store } from '../store.js'
import { isMobile } from '../browser'

// constants
import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import {
  asyncFocus,
  contextOf,
  deleteThought,
  getThoughtsRanked,
  headRank,
  headValue,
  isContextViewActive,
  isDivider,
  lastThoughtsFromContextChain,
  pathToContext,
  prevSibling,
  restoreSelection,
  rootedContextOf,
  splitChain,
  unroot,
} from '../util.js'

export const deleteEmptyThought = () => dispatch => {
  const { cursor, contextViews, editing } = store.getState()
  const offset = window.getSelection().focusOffset

  if (cursor) {
    const showContexts = isContextViewActive(contextOf(cursor), { state: store.getState() })
    const contextChain = splitChain(cursor, contextViews)
    const thoughtsRanked = lastThoughtsFromContextChain(contextChain)
    const children = getThoughtsRanked(thoughtsRanked)

    if ((headValue(cursor) === '' && children.length === 0) || isDivider(headValue(cursor))) {
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

        dispatch({
          type: 'existingThoughtChange',
          oldValue: prev.value,
          newValue: valueNew,
          context,
          thoughtsRanked: contextOf(thoughtsRanked).concat(prev)
        })

        // merge children into merged thought
        children.forEach(child => {
          dispatch({
            type: 'existingThoughtMove',
            oldPath: thoughtsRanked.concat(child),
            newPath: thoughtsRankedPrevNew.concat(child)
          })
        })

        dispatch({
          type: 'existingThoughtDelete',
          rank,
          thoughtsRanked: unroot(thoughtsRanked)
        })

        // restore selection
        if (!isMobile || editing) {
          asyncFocus()
          restoreSelection(thoughtsRankedPrevNew, { offset: prev.value.length })
        }
        else {
          dispatch({ type: 'setCursor', thoughtsRanked: thoughtsRankedPrevNew })
        }
      }
    }
  }
}
