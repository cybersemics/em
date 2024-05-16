import Shortcut from '../@types/Shortcut'
import { showModalActionCreator as showModal } from '../actions/showModal'
import SettingsIcon from '../components/icons/SettingsIcon'

const shortcut: Shortcut = {
  id: 'settings',
  label: 'Settings',
  description: 'Customize your experience of em.',
  svg: SettingsIcon,
  exec: dispatch => dispatch(showModal({ id: 'settings' })),
  allowExecuteFromModal: true,
}

export default shortcut
