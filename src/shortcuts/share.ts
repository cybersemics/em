import Shortcut from '../@types/Shortcut'
import showModal from '../action-creators/showModal'
import ShareIcon from '../components/icons/ShareIcon'

const shortcut: Shortcut = {
  id: 'share',
  label: 'Sharing & Device Management',
  description: 'Add and remove devices, and share your thoughtspace with others.',
  svg: ShareIcon,
  exec: dispatch => dispatch(showModal({ id: 'share' })),
}

export default shortcut
