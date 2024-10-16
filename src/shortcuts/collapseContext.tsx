import Shortcut from '../@types/Shortcut'
import { collapseContextActionCreator as collapseContext } from '../actions/collapseContext'
import CollapseIcon from '../components/icons/CollapseIcon'

const collapseContextShortcut: Shortcut = {
  id: 'collapseContext',
  label: 'Collapse',
  description: 'Deletes the current thought and moves all its subthoughts up a level.',
  gesture: 'ldu',
  svg: CollapseIcon,
  keyboard: { key: 'c', meta: true, alt: true },
  canExecute: getState => !!getState().cursor,
  exec: dispatch => {
    dispatch(collapseContext({}))
  },
}

export default collapseContextShortcut
