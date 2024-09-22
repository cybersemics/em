import Shortcut from '../@types/Shortcut'
import { showModalActionCreator as showModal } from '../actions/showModal'
import Icon from '../components/icons/HelpIcon'
import scrollTo from '../device/scrollTo'

const customizeToolbarShortcut: Shortcut = {
  id: 'customizeToolbar',
  label: 'Customize Toolbar',
  description: 'Add or remove buttons from the toolbar.',
  svg: Icon,
  exec: dispatch => {
    dispatch(showModal({ id: 'customizeToolbar' }))
    scrollTo('top')
  },
  allowExecuteFromModal: true,
}

export default customizeToolbarShortcut
