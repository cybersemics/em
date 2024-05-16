import { startCase } from 'lodash'
import Shortcut from '../@types/Shortcut'
import { alertActionCreator as alert } from '../actions/alert'
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
  svg: RedoIcon,
  exec: (dispatch, getState) => {
    const lastActionType = getLatestActionType(getState().redoPatches)

    dispatch(redo())

    if (!lastActionType) return

    dispatch(alert(`Redo: ${startCase(lastActionType)}`, { isInline: true, clearDelay: 3000, showCloseLink: false }))
  },
  canExecute: getState => getState().redoPatches.length > 0,
}

export default redoShortcut
