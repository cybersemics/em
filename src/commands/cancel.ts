import Command from '../@types/Command'
import { noop } from '../constants'

const cancelShortcut: Command = {
  id: 'cancel',
  label: 'Cancel',
  description: 'Cancel the current gesture.',
  hideFromDesktopCommandUniverse: true,
  multicursor: false,
  exec: noop,
}

export default cancelShortcut
