import { asyncFocus, isDocumentEditable } from '../util'
import { Dispatch } from 'react'
import { Action } from 'redux'
import { Shortcut } from '../types'

const bumpThoughtDownShortcut: Shortcut = {
  id: 'bumpThought',
  name: 'Bump Thought Down',
  description: 'Bump the current thought down to its children and replace with empty text.',
  gesture: 'rld',
  keyboard: { key: 'b', alt: true },
  canExecute: getState => !!getState().cursor && isDocumentEditable(),
  exec: (dispatch: Dispatch<Action>) => {
    asyncFocus()
    dispatch({ type: 'bumpThoughtDown' })
  }
}

export default bumpThoughtDownShortcut
