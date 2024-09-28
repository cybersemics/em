import Shortcut from '../@types/Shortcut'
import { outdentActionCreator as outdent } from '../actions/outdent'
import OutdentIcon from '../components/icons/OutdentIcon'
import isDocumentEditable from '../util/isDocumentEditable'
import moveCursorBackward from './moveCursorBackward'

const outdentShortcut: Shortcut = {
  id: 'outdent',
  label: 'Outdent',
  description: 'Outdent? De-indent? Whatever the opposite of indent is. Move the current thought up a level.',
  overlay: {
    keyboard: moveCursorBackward.keyboard,
  },
  gesture: 'lrl',
  svg: OutdentIcon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state

    if (!cursor || cursor.length < 2) return

    dispatch(outdent())
  },
}

export default outdentShortcut
