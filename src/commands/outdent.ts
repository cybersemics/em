import Command from '../@types/Command'
import { outdentActionCreator as outdent } from '../actions/outdent'
import OutdentIcon from '../components/icons/OutdentIcon'
import selectedPaths from '../selectors/selectedPaths'
import isDocumentEditable from '../util/isDocumentEditable'
import moveCursorBackward from './moveCursorBackward'

const outdentCommand: Command = {
  id: 'outdent',
  label: 'Outdent',
  description: 'Outdent? De-indent? Whatever the opposite of indent is. Move the current thought up a level.',
  overlay: {
    keyboard: moveCursorBackward.keyboard,
  },
  gesture: 'lrl',
  multicursor: {
    filter: 'prefer-ancestor',
    reverse: true,
  },
  svg: OutdentIcon,
  canExecute: state => {
    // outdent is a no-op on a top-level thought, since there is no grandparent to move it into
    // descendants of another selected thought are outdented along with their ancestor, so they are excluded by the multicursor filter
    const paths = selectedPaths(state, 'prefer-ancestor')
    return isDocumentEditable() && paths.length > 0 && paths.every(path => path.length > 1)
  },
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state

    if (!cursor || cursor.length < 2) return

    dispatch(outdent())
  },
  hideTitleInPanels: true,
}

export default outdentCommand
