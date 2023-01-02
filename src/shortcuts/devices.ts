import Modal from '../@types/Modal'
import Shortcut from '../@types/Shortcut'
import showModal from '../action-creators/showModal'
import DeviceIcon from '../components/icons/DeviceIcon'

const shortcut: Shortcut = {
  id: 'devices',
  label: 'Device Management',
  description: 'Add or remove devices from this thoughtspace. Thoughts will be synced in realtime.',
  svg: DeviceIcon,
  exec: dispatch => dispatch(showModal({ id: Modal.devices })),
}

export default shortcut
