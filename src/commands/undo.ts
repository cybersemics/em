import { startCase } from 'lodash'
import Command from '../@types/Command'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { undoActionCreator as undo } from '../actions/undo'
import UndoIcon from '../components/UndoIcon'
import isUndoEnabled from '../selectors/isUndoEnabled'
import getLatestActionType from '../util/getLastActionType'

const undoCommand: Command = {
  id: 'undo',
  label: 'Undo',
  multicursor: false,
  description: state => {
    const lastActionType = getLatestActionType(state.undoPatches)

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
  // Native browser undo creates problems when document.execCommand has been used for formatting. (#3879)
  // canExecute should always be true so that it always calls e.preventDefault() and blocks native undo.
  isActive: state => isUndoEnabled(state),
  longPress: dispatch => {
    dispatch(toggleDropdown({ dropDownType: 'undoSlider' }))
  },
}

export default undoCommand
