import Command from '../@types/Command'
import { categorizeActionCreator as categorize } from '../actions/categorize'
import CategorizeIcon from '../components/icons/CategorizeIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const categorizeCommand: Command = {
  id: 'categorize',
  label: 'Categorize',
  description: 'Move the current thought into a new, empty thought at the same level.',
  gesture: 'lu',
  keyboard: [
    { key: 'o', meta: true, alt: true },
    { key: ']', meta: true },
  ],
  // Multicursor functionality is handled in the categorize action.
  // TODO: Implement this with multicursor: true so that we don't need to make a special case of this command in Select All chaining.
  // See: useFilteredCommands
  multicursor: false,
  svg: CategorizeIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => dispatch(categorize()),
}

export default categorizeCommand
