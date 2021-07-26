import { asyncFocus, isDocumentEditable } from '../util'
import { bumpThoughtDown, setCursor } from '../action-creators'
import { Shortcut } from '../@types'

const bumpThoughtDownShortcut: Shortcut = {
  id: 'bumpThought',
  label: 'Bump Thought Down',
  description: 'Bump the current thought down to its children and replace with empty text.',
  gesture: 'rld',
  keyboard: { key: 'd', meta: true, alt: true },
  canExecute: getState => !!getState().cursor && isDocumentEditable(),
  exec: (dispatch, getState) => {
    asyncFocus()
    dispatch(bumpThoughtDown())

    // trigger useEffect callback on Editable component by causing a change on isEditing props
    const cursor = getState().cursor
    dispatch(
      setCursor({
        path: null,
      }),
    )
    dispatch(
      setCursor({
        path: cursor,
        offset: 0,
        editing: true,
      }),
    )
  },
}

export default bumpThoughtDownShortcut
