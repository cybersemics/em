import Command from '../@types/Command'
import { toggleHiddenThoughtsActionCreator as toggleHiddenThoughts } from '../actions/toggleHiddenThoughts'
import HiddenThoughtsIcon from '../components/icons/HiddenThoughtsIcon'

const toggleHiddenThoughtsCommand: Command = {
  id: 'toggleHiddenThoughts',
  label: 'Show Hidden Thoughts',
  labelInverse: 'Hide Hidden Thoughts',
  description: 'Show all hidden thoughts.',
  descriptionInverse: 'Hide hidden thoughts.',
  keyboard: { key: 'h', shift: true, alt: true },
  multicursor: 'ignore',
  svg: HiddenThoughtsIcon,
  exec: dispatch => dispatch(toggleHiddenThoughts()),
  isActive: state => state.showHiddenThoughts,
}

export default toggleHiddenThoughtsCommand
