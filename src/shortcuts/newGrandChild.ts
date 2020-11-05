import { isDocumentEditable } from '../util'
import { Dispatch } from 'react'
import { Action } from 'redux'
import { Shortcut } from '../types'

const newGrandChild: Shortcut = {
  id: 'newGrandChild',
  name: 'New Grand Child',
  description: 'Create a new grand child in the current thought. Add it to the first visible subthought.',
  gesture: 'rdrd',
  canExecute: () => isDocumentEditable(),
  exec: (dispatch: Dispatch<Action>) => dispatch({ type: 'newGrandChild' })
}

export default newGrandChild
