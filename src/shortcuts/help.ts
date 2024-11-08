import Shortcut from '../@types/Shortcut'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { isTouch } from '../browser'
import HelpIcon from '../components/icons/HelpIcon'
import scrollTo from '../device/scrollTo'

const openHelpShortcut: Shortcut = {
  id: 'help',
  label: 'Help',
  description: `Opens the Help screen, which contains the tutorials and a list of all ${
    isTouch ? 'gestures' : 'keyboard shortcuts'
  }.`,
  keyboard: { key: '/', meta: true },
  multicursor: 'ignore',
  svg: HelpIcon,
  exec: dispatch => {
    dispatch(showModal({ id: 'help' }))
    scrollTo('top')
  },
  allowExecuteFromModal: true,
}

export default openHelpShortcut
