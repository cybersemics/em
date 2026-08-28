import Command from '../@types/Command'
import { noop } from '../constants'

const cancelShortcut = {
  id: 'cancel',
  label: 'Cancel' as const,
  description: 'Scratch it out. Cancels the current gesture.',
  hideFromDesktopCommandUniverse: true,
  multicursor: false,
  exec: noop,
} satisfies Command

export default cancelShortcut
