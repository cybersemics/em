import React, { Dispatch } from 'react'
import { Context, Icon as IconType, Path, Shortcut } from '../types'
import { getSetting } from '../selectors'
import { pathToContext, rootedContextOf } from '../util'
import { State } from '../util/initialState'
import { Nullable } from '../utilTypes'
import { ROOT_TOKEN } from '../constants'

interface ToggleAttribute {
  type: 'toggleAttribute',
  context: Context,
  key: string,
  value: string,
}

interface SetCursor {
  type: 'setCursor',
  thoughtsRanked: Nullable<Path>,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ size = 20, style }: IconType) => <svg version='1.1' className='icon' xmlns='http://www.w3.org/2000/svg' width={size} height={size} style={style} viewBox='0 0 24 24' enableBackground='new 0 0 24 24'>
  <g style={{ transform: 'translateY(4px)' }}>
    <polygon points='5,14.2 5,0 3,0 3,14.2 1.4,12.6 0,14 4,18 8,14 6.6,12.6'/>
    <rect x='10' y='16' width='11' height='2'/>
    <rect x='10' y='12' width='9' height='2'/>
    <rect x='10' y='8' width='7' height='2'/>
    <rect x='10' y='4' width='5' height='2'/>
    <rect x='10' y='0' width='3' height='2'/>
  </g>
</svg>

const toggleSortShortcut: Shortcut = {
  id: 'toggleSort',
  name: 'Toggle Sort',
  description: 'Sort the current context alphabetically.',
  keyboard: { key: 's', alt: true },
  svg: Icon,
  exec: (dispatch: Dispatch<ToggleAttribute | SetCursor>, getState: () => State) => {
    const state = getState()
    const { cursor } = state
    const globalSort = getSetting(state, ['Global Sort'])
    const sortPreference = globalSort === 'Alphabetical' ? 'None' : 'Alphabetical'

    if (cursor) {
      const path = rootedContextOf(cursor)
      if (path.length === 0) return

      dispatch({
        type: 'toggleAttribute',
        context: pathToContext(path),
        key: '=sort',
        value: sortPreference
      })
      dispatch({ type: 'setCursor', thoughtsRanked: state.cursor })
    }
    else {
      dispatch({
        type: 'toggleAttribute',
        context: [ROOT_TOKEN],
        key: '=sort',
        value: sortPreference
      })
    }
  }
}

export default toggleSortShortcut
