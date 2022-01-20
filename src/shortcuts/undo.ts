import UndoIcon from '../components/UndoIcon'
import { Shortcut } from '../@types'
import { isUndoEnabled } from '../selectors/isUndoEnabled'
import { alert as alertAction } from '../action-creators'

const undoShortcut: Shortcut = {
  id: 'undo',
  label: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  exec: (dispatch, getState) => {
    if (!isUndoEnabled(getState())) return
    dispatch({ type: 'undoAction' })

    const lastActionType = getState().lastActionType
    if (!lastActionType) return
    dispatch(alertAction(`Undo: ${lastActionType}`, { isInline: true }))
  },
  isActive: getState => isUndoEnabled(getState()),
}

export default undoShortcut
