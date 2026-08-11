import { startCase } from 'lodash'
import Command from '../@types/Command'
import { redoActionCreator as redo } from '../actions/redo'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import RedoIcon from '../components/RedoIcon'
import isRedoEnabled from '../selectors/isRedoEnabled'
import getLatestActionType from '../util/getLastActionType'

const redoCommand: Command = {
  id: 'redo',
  label: 'Redo',
  multicursor: false,
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
  canExecute: state => isRedoEnabled(state),
  longPress: dispatch => {
    dispatch(toggleDropdown({ dropDownType: 'undoSlider' }))
  },
}

export default redoCommand
