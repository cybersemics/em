import Command from '../@types/Command'
import { extractThoughtActionCreator as extract } from '../actions/extractThought'
import ExtractThoughtIcon from '../components/icons/ExtractThoughtIcon'
import hasMulticursor from '../selectors/hasMulticursor'

const extractThought: Command = {
  id: 'extractThought',
  label: 'Extract',
  description: 'Extract selected part of a thought as its child',
  keyboard: { key: 'e', control: true, meta: true },
  multicursor: {
    enabled: false,
    error: 'Cannot extract multiple thoughts.',
  },
  svg: ExtractThoughtIcon,
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  exec: dispatch => {
    dispatch(extract())
  },
}

export default extractThought
