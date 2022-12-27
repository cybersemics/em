import Shortcut from '../@types/Shortcut'
import showModal from '../action-creators/showModal'
import DeviceIcon from '../components/icons/DeviceIcon'

const shortcut: Shortcut = {
  id: 'share',
  label: 'Sharing & Device Management',
  description: 'Add and remove devices, and share your thoughtspace with others.',
  svg: DeviceIcon,
  exec: dispatch => dispatch(showModal({ id: 'share' })),
}

export default shortcut
