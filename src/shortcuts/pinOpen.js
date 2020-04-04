import React from 'react'
import { store } from '../store'
import toggleAttribute from '../action-creators/toggleAttribute.js'

// util
import {
  attribute,
  contextOf,
  pathToContext,
} from '../util'

const Icon = ({ size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} style={style} viewBox="0 0 24 24" enableBackground="new 0 0 24 24">
  <g id="_15.Pin" data-name="15.Pin">
    <path d="M 12.40625 2 L 11 3.40625 L 12.03125 4.4375 C 10.439502 6.6860041 9.59375 10 9.59375 10 L 7.46875 11.0625 L 6 9.59375 L 4.59375 11 L 13 19.40625 L 14.40625 18 L 12.84375 16.4375 L 13.90625 14.3125 C 13.90625 14.481877 17.461253 13.278745 19.53125 11.9375 L 20.59375 13 L 22 11.59375 L 12.40625 2 z M 7 15.59375 L 2 20.59375 L 3.40625 22 L 8.40625 17 L 7 15.59375 z" />
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
