import Shortcut from '../@types/Shortcut'
import SettingsIcon from '../components/icons/SettingsIcon'
import { showModalActionCreator as showModal } from '../reducers/showModal'

const shortcut: Shortcut = {
  id: 'settings',
  label: 'Settings',
  description: 'Customize your experience of em.',
  svg: SettingsIcon,
  exec: dispatch => dispatch(showModal({ id: 'settings' })),
  allowExecuteFromModal: true,
}

export default shortcut
