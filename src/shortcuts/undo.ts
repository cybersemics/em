import { startCase } from 'lodash'
import Shortcut from '../@types/Shortcut'
import { undoActionCreator as undo } from '../actions/undo'
import UndoIcon from '../components/UndoIcon'
import isUndoEnabled from '../selectors/isUndoEnabled'
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
  keyboard: { key: 'z', meta: true },
  svg: UndoIcon,
  exec: (dispatch, getState) => {
    if (!isUndoEnabled(getState())) return
    dispatch(undo())
  },
  canExecute: getState => isUndoEnabled(getState()),
}

export default undoShortcut
