import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteThoughtWithCursorActionCreator as deleteThoughtWithCursor } from '../actions/deleteThoughtWithCursor'
import { errorActionCreator as error } from '../actions/error'
import Icon from '../components/icons/DeleteIcon'
import { AlertType, DELETE_VIBRATE_DURATION, Settings } from '../constants'
import deleteThoughtAlertText from '../selectors/deleteThoughtAlertText'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import getUserSetting from '../selectors/getUserSetting'
import hasMulticursor from '../selectors/hasMulticursor'
import simplifyPath from '../selectors/simplifyPath'
import ellipsize from '../util/ellipsize'
import haptics from '../util/haptics'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Command['exec'] = (dispatch, getState, e, { type }) => {
  const state = getState()
  const { cursor } = state

  // NOOP but default browser behavior is still prevented
  // otherwise Chrome/Brave will open "Clear browsing data"
  if (!cursor) return

  const value = getThoughtById(state, head(simplifyPath(state, cursor)))?.value
  if (value === undefined) return

  if (isEM(cursor) || isRoot(cursor)) {
    dispatch(error({ value: `The "${isEM(cursor) ? 'em' : 'home'} context" cannot be deleted.` }))
  } else if (findDescendant(state, head(cursor), '=readonly')) {
    dispatch(error({ value: `"${ellipsize(value)}" is read-only and cannot be deleted.` }))
  } else {
    // only activate haptics on gesture, since mobile also executes the delete command when hitting backspace on the keyboard
    if (type === 'gesture' && value !== '') {
      haptics.vibrate(DELETE_VIBRATE_DURATION)
    }

    dispatch(deleteThoughtWithCursor())

    // Alert which thought was deleted.
    // Only show alert for empty thought in training mode.
    const experienceMode = getUserSetting(Settings.experienceMode)
    if (value || !experienceMode) {
      dispatch(
        alert(deleteThoughtAlertText(state, cursor), {
          alertType: AlertType.ThoughtDeleted,
          clearDelay: 8000,
          showCloseLink: true,
        }),
      )
    }
  }
}

const deleteCommand: Command = {
  id: 'delete',
  label: 'Delete',
  description: 'Say goodbye to the current thought. Hit undo if you are not ready to part ways.',
  gesture: 'ldldl',
  multicursor: {
    preventSetCursor: true,
    reverse: true,
    clearMulticursor: true,
    onComplete(filteredCursors, dispatch, getState) {
      dispatch(
        alert(`Deleted ${filteredCursors.length} thoughts.`, {
          alertType: AlertType.ThoughtDeleted,
          clearDelay: 8000,
          showCloseLink: true,
        }),
      )
    },
  },
  keyboard: { key: Key.Backspace, alt: true, shift: true, meta: true },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec,
  svg: Icon,
}

export default deleteCommand
