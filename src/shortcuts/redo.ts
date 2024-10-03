import { startCase } from 'lodash'
import Shortcut from '../@types/Shortcut'
import { redoActionCreator as redo } from '../actions/redo'
import RedoIcon from '../components/RedoIcon'
import getLatestActionType from '../util/getLastActionType'

const redoShortcut: Shortcut = {
  id: 'redo',
  label: 'Redo',
  description: getState => {
    const lastActionType = getLatestActionType(getState().redoPatches)

    if (lastActionType) {
      return `Redo ${startCase(lastActionType)}`
    }

    return 'Redo'
  },
  keyboard: { key: 'z', meta: true, shift: true },
  svg: RedoIcon,
  exec: dispatch => {
    dispatch(redo())
  },
  canExecute: getState => getState().redoPatches.length > 0,
}

export default redoShortcut
