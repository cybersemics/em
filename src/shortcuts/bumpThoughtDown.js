// util
import {
  asyncFocus,
  isDocumentEditable,
} from '../util'

const bumpThoughtDownShortcut = {
  id: 'bumpThought',
  name: 'Bump Thought Down',
  description: 'Bump the current thought down to its children and replace with empty text.',
  gesture: 'rld',
  keyboard: { key: 'b', alt: true },
  // eslint-disable-next-line
  canExecute: getState => getState().cursor && isDocumentEditable(),
  // eslint-disable-next-line
  exec: dispatch => {
    asyncFocus()
    dispatch({ type: 'bumpThoughtDown' })
  }
}

export default bumpThoughtDownShortcut
