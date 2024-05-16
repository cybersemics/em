import Shortcut from '../@types/Shortcut'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { isTouch } from '../browser'
import Icon from '../components/icons/HelpIcon'
import scrollTo from '../device/scrollTo'

const openHelpShortcut: Shortcut = {
  id: 'help',
  label: 'Help',
  description: `Opens the Help manual, which contains the tutorials and a list of all ${
    isTouch ? 'gestures' : 'keyboard shortcuts'
  }.`,
  keyboard: { key: '/', meta: true },
  svg: Icon,
  exec: dispatch => {
    dispatch(showModal({ id: 'help' }))
    scrollTo('top')
  },
  allowExecuteFromModal: true,
}

export default openHelpShortcut
