import Command from '../@types/Command'
import { toggleEmContextActionCreator as toggleEmContext } from '../actions/toggleEmContext'
import SettingsIcon from '../components/icons/SettingsIcon'
import isEM from '../util/isEM'

const editSettingsCommand: Command = {
  id: 'editSettings',
  label: 'Edit Settings',
  description: 'Edit the raw settings of em as an outline. Toggles back to your thoughts when activated again.',
  multicursor: false,
  svg: SettingsIcon,
  isActive: state => isEM(state.rootContext),
  exec: dispatch => dispatch(toggleEmContext()),
}

export default editSettingsCommand
