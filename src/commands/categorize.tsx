import Command from '../@types/Command'
import { categorizeActionCreator as categorize } from '../actions/categorize'
import { subcategorizeMulticursorActionCreator as subcategorizeMulticursor } from '../actions/subcategorizeMulticursor'
import CategorizeIcon from '../components/icons/CategorizeIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const multicursor: Command['multicursor'] = {
  execMulticursor: (_cursors, dispatch) => dispatch(subcategorizeMulticursor()),
  preventSetCursor: true,
  clearMulticursor: true,
}

// NOTE: The keyboard shortcut for New Uncle handled in New Thought command until it is confirmed that commands are evaluated in the correct order
const categorizeCommand: Command = {
  id: 'categorize',
  label: 'Categorize',
  description: 'Move the current thought into a new, empty thought at the same level.',
  gesture: 'lu',
  keyboard: { key: 'o', meta: true, alt: true },
  multicursor,
  svg: CategorizeIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => dispatch(categorize()),
}

// a command for Raine until we have custom user commands
export const categorizeCommandAlias: Command = {
  id: 'categorizeAlias',
  label: 'Categorize',
  hideFromHelp: true,
  keyboard: { key: ']', meta: true },
  multicursor,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => dispatch(categorize()),
}

export default categorizeCommand
