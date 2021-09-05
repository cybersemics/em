import { Key } from 'ts-key-enum'
import { hasChild } from '../selectors'
import { ellipsize, head, isDocumentEditable, isEM, isRoot, pathToContext } from '../util'
import { alert, deleteThoughtWithCursor, error } from '../action-creators'
import { Shortcut } from '../@types'

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState, e) => {
  const state = getState()
  const { cursor } = state

  if (cursor) {
    const context = pathToContext(state, cursor)
    const cursorThought = state.thoughts.contextIndex[head(cursor)]

    if (isEM(cursor) || isRoot(cursor)) {
      dispatch(error({ value: `The "${isEM(cursor) ? 'em' : 'home'} context" cannot be deleted.` }))
    } else if (hasChild(state, context, '=readonly')) {
      dispatch(error({ value: `"${ellipsize(cursorThought.value)}" is read-only and cannot be deleted.` }))
    } else {
      // undo alert
      dispatch(
        alert(`Deleted ${ellipsize(cursorThought.value)}`, {
          showCloseLink: true,
          clearTimeout: 8000,
        }),
      )

      // delete the thought
      dispatch(deleteThoughtWithCursor({ path: cursor }))
    }
  }
}

const deleteShortcut: Shortcut = {
  id: 'delete',
  label: 'Delete',
  description: 'Permanently delete the current thought.',
  gesture: 'ldldl',
  keyboard: { key: Key.Backspace, alt: true, shift: true, meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec,
}

export default deleteShortcut
