import Command from '../@types/Command'
import { collapseContextActionCreator as collapseContext } from '../actions/collapseContext'
import CollapseIcon from '../components/icons/CollapseIcon'
import hasMulticursor from '../selectors/hasMulticursor'

const collapseContextCommand: Command = {
  id: 'collapseContext',
  label: 'Collapse',
  description: 'Deletes the current thought and moves all its subthoughts up a level.',
  gesture: 'dr',
  multicursor: {
    enabled: true,
    preventSetCursor: true,
    reverse: true,
  },
  svg: CollapseIcon,
  keyboard: { key: 'c', meta: true, alt: true },
  canExecute: state => {
    return !!state.cursor || hasMulticursor(state)
  },
  exec: dispatch => {
    dispatch(collapseContext({}))
  },
}

export default collapseContextCommand
