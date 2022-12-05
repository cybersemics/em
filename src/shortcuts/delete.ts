import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import alert from '../action-creators/alert'
import deleteThoughtWithCursor from '../action-creators/deleteThoughtWithCursor'
import error from '../action-creators/error'
import Icon from '../components/icons/DeleteIcon'
import { AlertType, EM_TOKEN } from '../constants'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import simplifyPath from '../selectors/simplifyPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState, e) => {
  const state = getState()
  const { cursor } = state

  // NOOP but default browser behavior is still prevented
  // otherwise Chrome/Brave will open "Clear browsing data"
  if (!cursor) return

  const value = getThoughtById(state, head(simplifyPath(state, cursor))).value

  if (isEM(cursor) || isRoot(cursor)) {
    dispatch(error({ value: `The "${isEM(cursor) ? 'em' : 'home'} context" cannot be deleted.` }))
  } else if (findDescendant(state, head(cursor), '=readonly')) {
    dispatch(error({ value: `"${ellipsize(value)}" is read-only and cannot be deleted.` }))
  } else {
    const parentPath = parentOf(cursor)
    const showContexts = isContextViewActive(state, parentPath)
    dispatch(deleteThoughtWithCursor({ path: cursor }))

    // Alert which thought was deleted.
    // Only show alert for empty thought in training mode.
    const experienceMode = !!findDescendant(state, EM_TOKEN, ['Settings', 'experienceMode'])
    if (value || !experienceMode) {
      dispatch(
        alert(
          `Deleted ${value ? ellipsize(value) : 'empty thought'}${
            showContexts ? ' from ' + ellipsize(headValue(state, cursor)) : ''
          }`,
          {
            alertType: AlertType.ThoughtDeleted,
            clearDelay: 8000,
            showCloseLink: true,
          },
        ),
      )
    }
  }
}

const deleteShortcut: Shortcut = {
  id: 'delete',
  label: 'Delete',
  description: 'Say goodbye to the current thought. Hit undo if you are not ready to part ways.',
  gesture: 'ldl',
  keyboard: { key: Key.Backspace, shift: true, meta: true },
  exec,
  svg: Icon,
}

export default deleteShortcut
