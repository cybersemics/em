import { startCase } from 'lodash'
import Shortcut from '../@types/Shortcut'
import undo from '../action-creators/undo'
import UndoIcon from '../components/UndoIcon'
import { alertActionCreator as alert } from '../reducers/alert'
import { isUndoEnabled } from '../selectors/isUndoEnabled'
import getLatestActionType from '../util/getLastActionType'

const undoShortcut: Shortcut = {
  id: 'undo',
  label: 'Undo',
  description: getState => {
    const lastActionType = getLatestActionType(getState().undoPatches)

    if (lastActionType) {
      return `Undo ${startCase(lastActionType)}`
    }

    return 'Undo.'
  },
  svg: UndoIcon,
  exec: (dispatch, getState) => {
    if (!isUndoEnabled(getState())) return

    const lastActionType = getLatestActionType(getState().undoPatches)

    dispatch(undo())

    if (!lastActionType) return

    dispatch(alert(`Undo: ${startCase(lastActionType)}`, { isInline: true, clearDelay: 3000, showCloseLink: false }))
  },
  canExecute: getState => isUndoEnabled(getState()),
}

export default undoShortcut
