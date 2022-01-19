import RedoIcon from '../components/RedoIcon'
import { Shortcut } from '../@types'
import { isRedoEnabled } from '../selectors/isRedoEnabled'
import { alert } from '../action-creators'

let redoLastActionTimer: number

const redoShortcut: Shortcut = {
  id: 'redo',
  label: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  exec: (dispatch, getState) => {
    if (!isRedoEnabled(getState())) return
    dispatch({ type: 'redoAction' })

    // dispatch an alert action
    dispatch({
      type: 'alert',
      value: `Redo: ${getState().redoLastAction}`,
      alertType: 'redoLastAction',
      isInline: true,
    })
    // clear the redo alert timer to prevent previously cleared undo alert from closing this one
    clearTimeout(redoLastActionTimer)

    // close the alert after a delay
    // only close the alert if it is an redo alert
    redoLastActionTimer = window.setTimeout(() => {
      const state = getState()
      if (state.alert && state.alert.alertType === 'redoLastAction') {
        dispatch(alert(null))
      }
    }, 3000)
  },
  isActive: getState => isRedoEnabled(getState()),
}

export default redoShortcut
