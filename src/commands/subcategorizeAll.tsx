import Command from '../@types/Command'
import { subCategorizeAllActionCreator as subCategorizeAll } from '../actions/subCategorizeAll'
import { subcategorizeMulticursorActionCreator as subcategorizeMulticursor } from '../actions/subcategorizeMulticursor'
import SubCategorizeAllIcon from '../components/icons/SubCategorizeAllIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const subCategorizeAllCommand: Command = {
  id: 'subcategorizeAll',
  label: 'Subcategorize All',
  description: 'Move all thoughts at the current level into a new, empty thought.',
  gesture: 'ldrlu',
  keyboard: { key: 'a', meta: true, alt: true },
  multicursor: {
    enabled: true,
    execMulticursor: (_cursors, dispatch) => dispatch(subcategorizeMulticursor()),
    preventSetCursor: true,
    clearMulticursor: true,
  },
  svg: SubCategorizeAllIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: subCategorizeAll(),
}

export default subCategorizeAllCommand
