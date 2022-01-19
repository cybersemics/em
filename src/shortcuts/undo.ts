import UndoIcon from '../components/UndoIcon'
import { Shortcut } from '../@types'
import { isUndoEnabled } from '../selectors/isUndoEnabled'
import { alert as alertAction } from '../action-creators'

let undoLastActionTimer: number

const undoShortcut: Shortcut = {
  id: 'undo',
  label: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  exec: (dispatch, getState) => {
    if (!isUndoEnabled(getState())) return
    dispatch({ type: 'undoAction' })

    // dispatch an alert action
    dispatch({
      type: 'alert',
      value: `Undo: ${getState().undoLastAction}`,
      alertType: 'undoLastAction',
      isInline: true,
    })

    // clear the undo alert timer to prevent previously cleared undo alert from closing this one

    clearTimeout(undoLastActionTimer)

    // close the alert after a delay
    // only close the alert if it is an undo alert
    undoLastActionTimer = window.setTimeout(() => {
      const state = getState()
      if (state.alert && state.alert.alertType === 'undoLastAction') {
        dispatch(alertAction(null))
      }
    }, 3000)
  },
  isActive: getState => isUndoEnabled(getState()),
}

export default undoShortcut
