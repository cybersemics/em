import Shortcut from '../@types/Shortcut'
import { outdentActionCreator as outdent } from '../actions/outdent'
import OutdentIcon from '../components/icons/OutdentIcon'
import hasMulticursor from '../selectors/hasMulticursor'
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
  multicursor: {
    enabled: true,
    filter: 'prefer-ancestor',
    reverse: true,
  },
  svg: OutdentIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state

    if (!cursor || cursor.length < 2) return

    dispatch(outdent())
  },
}

export default outdentShortcut
