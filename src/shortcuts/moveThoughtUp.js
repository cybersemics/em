import React from 'react'
import { store } from '../store.js'

// util
import {
  contextOf,
  headRank,
  headValue,
  getRankBefore,
  prevSibling,
  restoreSelection,
  rootedContextOf,
} from '../util.js'

const moveThoughtUpSVG = <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 19.481 19.481" enableBackground="new 0 0 19.481 19.481">
    <g>
        <path d="m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z" fill="white"/>
    </g>
</svg>

export default {
    id: 'moveThoughtUp',
    name: 'Move Thought Up',
    description: 'Move the current thought up.',
    keyboard: { key: 'ArrowUp', meta: true, shift: true },
    svg: moveThoughtUpSVG,
    exec: () => {
      const { cursor } = store.getState()

      if (cursor) {

        const context = contextOf(cursor)
        const value = headValue(cursor)
        const rank = headRank(cursor)

        const prevThought = prevSibling(value, rootedContextOf(cursor), rank)
        if (prevThought) {

          // store selection offset before existingThoughtMove is dispatched
          const offset = window.getSelection().focusOffset

          const rankNew = getRankBefore(context.concat(prevThought))
          const newPath = context.concat({
            value,
            rank: rankNew
          })

          store.dispatch({
            type: 'existingThoughtMove',
            oldPath: cursor,
            newPath
          })

          restoreSelection(newPath, { offset })
        }
      }
    }
  }
