import RedoIcon from '../components/RedoIcon'
import { Shortcut } from '../@types'
import { isRedoEnabled } from '../selectors/isRedoEnabled'
import { alert as alertAction } from '../action-creators'

const redoShortcut: Shortcut = {
  id: 'redo',
  label: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  exec: (dispatch, getState) => {
    if (!isRedoEnabled(getState())) return
    dispatch({ type: 'redoAction' })

    const lastActionType = getState().lastActionType
    if (!lastActionType) return
    dispatch(alertAction(`Redo: ${lastActionType}`, { isInline: true }))
  },
  isActive: getState => isRedoEnabled(getState()),
}

export default redoShortcut
