import Shortcut from '../@types/Shortcut'
import { toggleContextViewActionCreator as toggleContextView } from '../actions/toggleContextView'
import ContextViewIcon from '../components/icons/ContextViewIcon'
import isContextViewActive from '../selectors/isContextViewActive'

const toggleContextViewShortcut: Shortcut = {
  id: 'toggleContextView',
  label: 'Context View',
  description:
    'Opens the context view of the current thought. The context view shows all contexts throughout your thoughtspace in which the thought can be found. Use the same shortcut to close the context view.',
  descriptionInverse:
    'Closes the context view of the current thought. The context view shows all contexts throughout your thoughtspace in which the thought can be found.',
  gesture: 'ru',
  keyboard: { key: 's', shift: true, alt: true },
  svg: ContextViewIcon,
  canExecute: getState => !!getState().cursor,
  isActive: getState => {
    const state = getState()
    return !!state.cursor && isContextViewActive(getState(), state.cursor)
  },
  exec: dispatch => dispatch(toggleContextView()),
}

export default toggleContextViewShortcut
