import Command from '../@types/Command'
import { toggleContextViewActionCreator as toggleContextView } from '../actions/toggleContextView'
import ContextViewIcon from '../components/icons/ContextViewIcon'
import isContextViewActive from '../selectors/isContextViewActive'

const toggleContextViewCommand = {
  id: 'toggleContextView',
  label: 'Context View',
  description:
    'Opens the context view of the current thought. The context view shows all contexts throughout your thoughtspace in which the thought can be found. Use the same command to close the context view.',
  descriptionInverse:
    'Closes the context view of the current thought. The context view shows all contexts throughout your thoughtspace in which the thought can be found.',
  gesture: 'ru',
  keyboard: { key: 's', shift: true, alt: true },
  multicursor: true,
  svg: ContextViewIcon,
  canExecute: state => !!state.cursor,
  isActive: state => {
    return !!state.cursor && isContextViewActive(state, state.cursor)
  },
  exec: dispatch => dispatch(toggleContextView()),
} satisfies Command

export default toggleContextViewCommand
