import { startCase } from 'lodash'
import Command from '../@types/Command'
import { redoActionCreator as redo } from '../actions/redo'
import RedoIcon from '../components/RedoIcon'
import getLatestActionType from '../util/getLastActionType'

const redoShortcut: Command = {
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
  keyboard: { key: 'z', meta: true, shift: true },
  svg: RedoIcon,
  exec: dispatch => {
    dispatch(redo())
  },
  canExecute: state => state.redoPatches.length > 0,
}

export default redoShortcut
