import Shortcut from '../@types/Shortcut'
import { showModalActionCreator as showModal } from '../actions/showModal'
import DeviceIcon from '../components/icons/DeviceIcon'

const shortcut: Shortcut = {
  id: 'devices',
  label: 'Device Management',
  description: 'Add or remove devices that can access and edit this thoughtspace.',
  svg: DeviceIcon,
  exec: dispatch => dispatch(showModal({ id: 'devices' })),
  allowExecuteFromModal: true,
}

export default shortcut
