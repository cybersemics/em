import React from 'react'
import { store } from '../store.js'
import toggleAttribute from '../action-creators/toggleAttribute.js'

// util
import {
  pathToContext,
} from '../util.js'

const Icon = ({ size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} style={style} viewBox="0 0 24 24" enableBackground="new 0 0 24 24">
  <g>
    <path d="M6 21l6-8h-4v-10h-4v10h-4l6 8zm16-4h-8v-2h8v2zm2 2h-10v2h10v-2zm-4-8h-6v2h6v-2zm-2-4h-4v2h4v-2zm-2-4h-2v2h2v-2z" />
  </g>
</svg>

export default {
  id: 'toggleSort',
  name: 'Toggle Sort',
  description: 'Sort the current context alphabetically, where subthoughts are sorted regardless of the rank.',
  keyboard: { key: 's', alt: true },
  svg: Icon,
  exec: () => {
    const { cursor } = store.getState()
    if (cursor) {
      store.dispatch(toggleAttribute(pathToContext(cursor), '=sort', 'Alphabetical'))
    }
  }
}
