import Command from '../@types/Command'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { isTouch } from '../browser'
import HelpIcon from '../components/icons/HelpIcon'
import scrollTo from '../device/scrollTo'

const openHelpShortcut: Command = {
  id: 'help',
  label: 'Help',
  description: `Opens the Help screen, which contains the tutorials and a list of all ${
    isTouch ? 'gestures' : 'keyboard commands'
  }.`,
  gesture: 'rdld',
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
