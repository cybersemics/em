import Command from '../@types/Command'
import { showModalActionCreator as showModal } from '../actions/showModal'
import SettingsIcon from '../components/icons/SettingsIcon'

const command: Command = {
  id: 'settings',
  label: 'Settings',
  description: 'Customize your experience of em.',
  multicursor: false,
  svg: SettingsIcon,
  exec: dispatch => dispatch(showModal({ id: 'settings' })),
  allowExecuteFromModal: true,
}

export default command
