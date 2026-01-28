import { startCase } from 'lodash'
import Command from '../@types/Command'
import { redoActionCreator as redo } from '../actions/redo'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import RedoIcon from '../components/RedoIcon'
import getLatestActionType from '../util/getLastActionType'

const redoCommand = {
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
  canExecute: state => state.redoPatches.length > 0,
  longPress: dispatch => {
    dispatch(toggleDropdown({ dropDownType: 'undoSlider' }))
  },
} satisfies Command

export default redoCommand
