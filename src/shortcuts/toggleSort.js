import React from 'react'
import toggleAttribute from '../action-creators/toggleAttribute'

// util
import {
  pathToContext,
} from '../util'

// selectors
import { getSetting } from '../selectors'

const Icon = ({ size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} style={style} viewBox="0 0 24 24" enableBackground="new 0 0 24 24">
  <g style={{ transform: 'translateY(4px)' }}>
    <polygon points="5,14.2 5,0 3,0 3,14.2 1.4,12.6 0,14 4,18 8,14 6.6,12.6"/>
    <rect x="10" y="16" width="11" height="2"/>
    <rect x="10" y="12" width="9" height="2"/>
    <rect x="10" y="8" width="7" height="2"/>
    <rect x="10" y="4" width="5" height="2"/>
    <rect x="10" y="0" width="3" height="2"/>
  </g>
</svg>

export default {
  id: 'toggleSort',
  name: 'Toggle Sort',
  description: 'Sort the current context alphabetically.',
  keyboard: { key: 's', alt: true },
  svg: Icon,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    const globalSort = getSetting(state, ['Global Sort'])
    const sortPreference = globalSort === 'Alphabetical' ? 'None' : 'Alphabetical'
    if (cursor) {
      dispatch(toggleAttribute(pathToContext(cursor), '=sort', sortPreference))
    }
  }
}
