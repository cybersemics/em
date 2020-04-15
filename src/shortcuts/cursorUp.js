import React from 'react'
import { store } from '../store'

// action-creators
import { cursorUp } from '../action-creators/cursorUp'

// util
import {
  contextOf,
} from '../util'

// selectors
import attribute from '../selectors/attribute'
import autoProse from '../selectors/autoProse'

const Icon = ({ fill = 'black', size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={fill} style={style} viewBox="0 0 19.481 19.481" enableBackground="new 0 0 19.481 19.481">
  <g>
    <path d="m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z" />
  </g>
</svg>

export default {
  id: 'cursorUp',
  name: 'Cursor Up',
  keyboard: { key: 'ArrowUp' },
  hideFromInstructions: true,
  svg: Icon,
  canExecute: () => {
    const state = store.getState()
    const { cursor } = state

    if (cursor) {
      const contextRanked = contextOf(cursor)
      const isProseView = attribute(state, contextRanked, '=view') === 'Prose'

      // default browser behavior in prose mode
      if ((isProseView || autoProse(state, contextRanked,)) && window.getSelection().focusOffset > 0) return false
    }
    return true
  },
  exec: e => store.dispatch(cursorUp({ target: e.target }))
}
