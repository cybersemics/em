import Command from '../@types/Command'
import { outdentActionCreator as outdent } from '../actions/outdent'
import OutdentIcon from '../components/icons/OutdentIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'
import gestures from './gestures'
import moveCursorBackward from './moveCursorBackward'

const outdentCommand: Command = {
  id: 'outdent',
  label: 'Outdent',
  description: 'Outdent? De-indent? Whatever the opposite of indent is. Move the current thought up a level.',
  overlay: {
    keyboard: moveCursorBackward.keyboard,
  },
  gesture: gestures.OUTDENT_GESTURE,
  multicursor: {
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
  hideTitleInPanels: true,
}

export default outdentCommand
