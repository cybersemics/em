import React from 'react'
import { store } from '../store'
import toggleAttribute from '../action-creators/toggleAttribute'

// util
import {
  attribute,
  contextOf,
  pathToContext,
} from '../util'

const Icon = ({ size = 20, style }) => <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="icon" viewBox="0 0 20 20" width={size} height={size} style={style}>
  <g transform="translate(-516 -144)">
    <g>
      <path d="M525,154.95V166h1v-11.05c1.694-0.245,3-1.688,3-3.45c0-1.933-1.566-3.5-3.5-3.5s-3.5,1.567-3.5,3.5    C522,153.261,523.306,154.705,525,154.95z M523,151.5c0-1.381,1.119-2.5,2.5-2.5s2.5,1.119,2.5,2.5s-1.119,2.5-2.5,2.5    S523,152.881,523,151.5z" />
    </g>
  </g>
</svg>

export default {
  id: 'pinOpen',
  name: 'Pin Open',
  description: 'Pin and expand the current thought.',
  keyboard: { key: 'p', alt: true },
  svg: Icon,
  exec: () => {
    const { cursor } = store.getState()
    const context = contextOf(cursor)
    const isPinned = attribute(context, '=pin') === 'true'
    if (cursor) {
      store.dispatch(toggleAttribute(pathToContext(cursor), '=pin', isPinned ? 'false' : 'true'))
    }
  }
}
