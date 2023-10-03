import Shortcut from '../@types/Shortcut'
import showModal from '../action-creators/showModal'
import SettingsIcon from '../components/icons/SettingsIcon'

const shortcut: Shortcut = {
  id: 'settings',
  label: 'Settings',
  description: 'Customize your experience of em.',
  svg: SettingsIcon,
  exec: dispatch => dispatch(showModal({ id: 'settings' })),
}

export default shortcut
