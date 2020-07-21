import { asyncFocus, isDocumentEditable } from '../util'
import { State } from '../util/initialState'
import { Dispatch } from 'react'
import { Action } from 'redux'

const bumpThoughtDownShortcut = {
  id: 'bumpThought',
  name: 'Bump Thought Down',
  description: 'Bump the current thought down to its children and replace with empty text.',
  gesture: 'rld',
  keyboard: { key: 'b', alt: true },
  canExecute: (getState: () => State) => getState().cursor && isDocumentEditable(),
  exec: (dispatch: Dispatch<Action>) => {
    asyncFocus()
    dispatch({ type: 'bumpThoughtDown' })
  }
}

export default bumpThoughtDownShortcut
