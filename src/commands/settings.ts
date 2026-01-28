import Command from '../@types/Command'
import { showModalActionCreator as showModal } from '../actions/showModal'
import SettingsIcon from '../components/icons/SettingsIcon'

const command = {
  id: 'settings',
  label: 'Settings',
  description: 'Customize your experience of em.',
  multicursor: false,
  svg: SettingsIcon,
  exec: dispatch => dispatch(showModal({ id: 'settings' })),
  allowExecuteFromModal: true,
} satisfies Command

export default command
