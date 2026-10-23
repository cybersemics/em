import Command from '../@types/Command'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { undoActionCreator as undo } from '../actions/undo'
import UndoIcon from '../components/UndoIcon'
import isUndoEnabled from '../selectors/isUndoEnabled'
import getLatestActionLabel from '../util/getLatestActionLabel'

const undoCommand = {
  id: 'undo',
  label: 'Undo' as const,
  multicursor: false,
  description: state => {
    const lastActionLabel = getLatestActionLabel(state.undoPatches)

    if (lastActionLabel) {
      return `Undo ${lastActionLabel}`
    }

    return 'Undo.'
  },
  keyboard: { key: 'z', meta: true },
  // Undo moves through the undo history rather than making a new undoable change, so Repeat should skip it and repeat the last edit instead.
  repeatable: false,
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
} satisfies Command

export default undoCommand
