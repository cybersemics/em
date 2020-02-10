import React from 'react'
import { store } from '../store.js'
import toggleAttribute from '../action-creators/toggleAttribute.js'

// util
import {
  pathToContext,
} from '../util.js'

const Icon = ({ size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} style={style} viewBox="0 0 24 24" enableBackground="new 0 0 24 24">
  <g>
    <path d="m21.5 24h-19c-1.378 0-2.5-1.121-2.5-2.5v-19c0-1.379 1.122-2.5 2.5-2.5h19c1.378 0 2.5 1.121 2.5 2.5v19c0 1.379-1.122 2.5-2.5 2.5zm-19-23c-.827 0-1.5.673-1.5 1.5v19c0 .827.673 1.5 1.5 1.5h19c.827 0 1.5-.673 1.5-1.5v-19c0-.827-.673-1.5-1.5-1.5z"/>
    <path d="m23.5 12.5h-23c-.276 0-.5-.224-.5-.5s.224-.5.5-.5h23c.276 0 .5.224.5.5s-.224.5-.5.5z"/>
    <path d="m12 24c-.276 0-.5-.224-.5-.5v-23c0-.276.224-.5.5-.5s.5.224.5.5v23c0 .276-.224.5-.5.5z"/>
  </g>
  </svg>

export default {
  id: 'toggleTableView',
  name: 'Toggle Table View',
  description: 'View the current context as a table, where each level of subthoughts is shown as a column.',
  gesture: 'rdlu',
  svg: Icon,
  exec: () => {
    const { cursor } = store.getState()
    if (cursor) {
      store.dispatch(toggleAttribute(pathToContext(cursor), '=view', 'Table'))
    }
  }
}
