import React from 'react'
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

const subcategorizeOneSVG = ({ fill = 'black' }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 19.481 19.481" enableBackground="new 0 0 19.481 19.481">
    <g>
        <path d="m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z" fill={fill} />
    </g>
</svg>

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
