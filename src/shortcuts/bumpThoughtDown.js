// util
import {
  asyncFocus,
  isDocumentEditable,
} from '../util'

export default {
  id: 'bumpThought',
  name: 'Bump Thought Down',
  description: 'Bump the current thought down to its children and replace with empty text.',
  gesture: 'rld',
  keyboard: { key: 'b', alt: true },
  canExecute: getState => getState().cursor && isDocumentEditable(),
  exec: dispatch => {
    asyncFocus()
    dispatch({ type: 'bumpThoughtDown' })
  }
}
