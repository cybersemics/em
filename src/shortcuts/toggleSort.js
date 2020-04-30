import React from 'react'
import { store } from '../store'
import toggleAttribute from '../action-creators/toggleAttribute'

// util
import {
  getSetting,
  pathToContext,
} from '../util'

const Icon = ({ size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} style={style} viewBox="0 0 24 24" enableBackground="new 0 0 24 24">
  <g>
    <path style={{ transform: 'scale(1.1)' }} d="M9.53027,15.46973a.74972.74972,0,0,1,0,1.06054l-2,2a.74971.74971,0,0,1-1.06054,0l-2-2a.74992.74992,0,1,1,1.06054-1.06054l.71973.71972V6a.75.75,0,0,1,1.5,0V16.18945l.71973-.71972A.74972.74972,0,0,1,9.53027,15.46973ZM19.25,7h-7.5a.75.75,0,0,0,0,1.5h7.5a.75.75,0,0,0,0-1.5Zm-1,3h-6.5a.75.75,0,0,0,0,1.5h6.5a.75.75,0,0,0,0-1.5Zm-1,3h-5.5a.75.75,0,0,0,0,1.5h5.5a.75.75,0,0,0,0-1.5Zm-1,3h-4.5a.75.75,0,0,0,0,1.5h4.5a.75.75,0,0,0,0-1.5Z"/>
  </g>
</svg>

export default {
  id: 'toggleSort',
  name: 'Toggle Sort',
  description: 'Sort the current context alphabetically.',
  keyboard: { key: 's', alt: true },
  svg: Icon,
  exec: () => {
    const { cursor } = store.getState()
    const globalSort = getSetting(['Global Sort'])
    const sortPreference = globalSort === 'Alphabetical' ? 'None' : 'Alphabetical'
    if (cursor) {
      store.dispatch(toggleAttribute(pathToContext(cursor), '=sort', sortPreference))
    }
  }
}
