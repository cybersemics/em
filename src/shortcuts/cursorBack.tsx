import React, { Dispatch } from 'react'
import { Icon as IconType, Shortcut } from '../types'
import { Action } from 'redux'
import { clearSelection, scrollCursorIntoView } from '../util'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ size = 20 }: IconType) => <svg version='1.1' className='icon' xmlns='http://www.w3.org/2000/svg' width={size} height={size} viewBox='0 0 19.481 19.481' enableBackground='new 0 0 19.481 19.481'>
  <g>
    <path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
  </g>
</svg>

/** Removes the browser selection. */
const blur = () => {
  if (document.activeElement) {
    (document.activeElement as HTMLInputElement).blur()
    clearSelection()
  }
}

const cursorBackShortcut: Shortcut = {
  id: 'cursorBack',
  name: 'Back',
  gesture: 'r',
  svg: Icon,
  keyboard: 'Escape',
  exec: (dispatch: Dispatch<Action>, getState) => {
    const { cursor, search } = getState()
    if (cursor || search != null) {

      dispatch({ type: 'cursorBack' })

      setTimeout(scrollCursorIntoView, 0)

      // clear browser selection if cursor has been removed
      if (!getState().cursor) {
        blur()
      }
    }
  }
}

export default cursorBackShortcut
