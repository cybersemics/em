import React from 'react'
import { isMobile } from '../browser.js'
import { store } from '../store.js'

// constants
import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import {
  asyncFocus,
  contextOf,
  deleteThought,
  getThoughts,
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

const deleteEmptyThoughtSVG = ({ fill = 'black', size = 20, id }) => <svg version="1.1" id={id} className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 19.481 19.481" enableBackground="new 0 0 19.481 19.481">
    <g>
        <path d="m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z" fill={fill} />
    </g>
</svg>

export default {
  id: 'deleteEmptyThought',
  name: 'Delete Empty Thought',
  keyboard: { key: 'Backspace' },
  hideFromInstructions: true,
  svg: deleteEmptyThoughtSVG,
  exec: e => {
    const { cursor, contextViews, editing } = store.getState()
    const offset = window.getSelection().focusOffset

    if (cursor) {
      const showContexts = isContextViewActive(contextOf(cursor), { state: store.getState() })
      const contextChain = splitChain(cursor, contextViews)
      const thoughtsRanked = lastThoughtsFromContextChain(contextChain)
      const children = getThoughts(thoughtsRanked)

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
            asyncFocus()
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
