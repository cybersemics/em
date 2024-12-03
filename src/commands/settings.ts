import Command from '../@types/Command'
import { showModalActionCreator as showModal } from '../actions/showModal'
import SettingsIcon from '../components/icons/SettingsIcon'

const shortcut: Command = {
  id: 'settings',
  label: 'Settings',
  description: 'Customize your experience of em.',
  multicursor: 'ignore',
  svg: SettingsIcon,
  exec: dispatch => dispatch(showModal({ id: 'settings' })),
  allowExecuteFromModal: true,
}

export default shortcut
