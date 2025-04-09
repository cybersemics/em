import Command from '../@types/Command'
import { noop } from '../constants'

const cancelShortcut: Command = {
  id: 'cancel',
  label: 'Cancel',
  description: 'Cancel the current gesture.',
  gesture: undefined,
  multicursor: false,
  exec: noop,
}

export default cancelShortcut
