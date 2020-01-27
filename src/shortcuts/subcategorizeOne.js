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

const subcategorizeOneSVG = ({ fill = 'black', size = 20, id }) => <svg version="1.1" id={id} className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox='0 0 24 24'>
  <path fill={fill} d="M12.6,15.782V8.218a2.939,2.939,0,1,0-1.2,0v7.564a2.939,2.939,0,1,0,1.2,0ZM10.26,5.34A1.74,1.74,0,1,1,12,7.081,1.743,1.743,0,0,1,10.26,5.34ZM12,20.4a1.741,1.741,0,1,1,1.74-1.74A1.743,1.743,0,0,1,12,20.4Z"/>
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
