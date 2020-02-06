import React from 'react'
import { store } from '../store.js'

// util
import {
  nextEditable,
} from '../util.js'

const Icon = ({ fill = 'black', size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={fill} style={style} viewBox="0 0 19.481 19.481" enableBackground="new 0 0 19.481 19.481">
  <g>
    <path d="m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z" />
  </g>
</svg>

export default {
  id: 'cursorNextThought',
  name: 'Cursor Next Thought',
  description: 'Move the cursor to the next thought, skipping expanded children.',
  keyboard: { key: 'ArrowDown', meta: true },
  svg: Icon,
  exec: () => {
    const { cursor } = store.getState()

    // select next editable
    if (cursor) {
      const next = nextEditable(cursor)
      if (next) {
        next.focus()
      }
    }
    // if no cursor, select first editable
    else {
      const firstEditable = document.querySelector('.editable')
      if (firstEditable) {
        firstEditable.focus()
      }
    }
  }
}
