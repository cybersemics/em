import { startCase } from 'lodash'
import Shortcut from '../@types/Shortcut'
import RedoIcon from '../components/RedoIcon'
import { alertActionCreator as alert } from '../reducers/alert'
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

    dispatch({ type: 'redoAction' })

    if (!lastActionType) return

    dispatch(alert(`Redo: ${startCase(lastActionType)}`, { isInline: true, clearDelay: 3000, showCloseLink: false }))
  },
  canExecute: getState => getState().redoPatches.length > 0,
}

export default redoShortcut
