import { startCase } from 'lodash'
import Shortcut from '../@types/Shortcut'
import { alertActionCreator as alert } from '../actions/alert'
import RedoIcon from '../components/RedoIcon'
import getLatestActionType from '../util/getLastActionType'

const redoShortcut: Shortcut = {
  id: 'redo',
  label: 'Redo',
  multicursor: 'ignore',
  description: state => {
    const lastActionType = getLatestActionType(state.redoPatches)

    if (lastActionType) {
      return `Redo ${startCase(lastActionType)}`
    }

    return 'Redo'
  },
  // keyboard: { key: 'z', meta: true, shift: true },
  svg: RedoIcon,
  exec: dispatch => {
    // TODO: https://github.com/cybersemics/em/issues/1631
    // dispatch(redo())
    dispatch(alert('Undo/Redo is currently under develeopment.'))
  },
  canExecute: state => state.redoPatches.length > 0,
}

export default redoShortcut
