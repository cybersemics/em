import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import alert from '../action-creators/alert'
import deleteThoughtWithCursor from '../action-creators/deleteThoughtWithCursor'
import error from '../action-creators/error'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState, e) => {
  const state = getState()
  const { cursor } = state

  // NOOP but default browser behavior is still prevented
  // otherwise Chrome/Brave will open "Clear browsing data"
  if (!cursor) return

  const cursorThought = getThoughtById(state, head(cursor))

  if (isEM(cursor) || isRoot(cursor)) {
    dispatch(error({ value: `The "${isEM(cursor) ? 'em' : 'home'} context" cannot be deleted.` }))
  } else if (findDescendant(state, head(cursor), '=readonly')) {
    dispatch(error({ value: `"${ellipsize(cursorThought.value)}" is read-only and cannot be deleted.` }))
  } else {
    // delete the thought
    dispatch(deleteThoughtWithCursor({ path: cursor }))

    // undo alert
    if (cursorThought.value) {
      dispatch(
        alert(`Deleted ${ellipsize(cursorThought.value)}`, {
          showCloseLink: true,
          clearDelay: 8000,
        }),
      )
    }
  }
}

const deleteShortcut: Shortcut = {
  id: 'delete',
  label: 'Delete',
  description: 'Permanently delete the current thought.',
  gesture: 'ldl',
  keyboard: { key: Key.Backspace, shift: true, meta: true },
  canExecute: getState => isDocumentEditable(),
  exec,
}

export default deleteShortcut
