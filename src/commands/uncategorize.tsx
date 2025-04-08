import Command from '../@types/Command'
import { uncategorizeActionCreator as uncategorize } from '../actions/uncategorize'
import UncategorizeIcon from '../components/icons/UncategorizeIcon'
import hasMulticursor from '../selectors/hasMulticursor'

const uncategorizeCommand: Command = {
  id: 'uncategorize',
  label: 'Uncategorize',
  description: 'Deletes the current thought and moves all its subthoughts up a level.',
  gesture: 'dr',
  multicursor: {
    preventSetCursor: true,
    reverse: true,
  },
  svg: UncategorizeIcon,
  keyboard: { key: 'c', meta: true, alt: true },
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  exec: dispatch => {
    dispatch(uncategorize({}))
  },
}

export default uncategorizeCommand
