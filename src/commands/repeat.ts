import Command from '../@types/Command'
import { noop } from '../constants'

const repeatCommand: Command = {
  id: 'repeat',
  label: 'Repeat',
  description: 'Repeats the last command. Repeats the last command.',
  keyboard: { key: '.', meta: true },
  // Repeat has no multicursor behavior of its own. It is resolved to the last command before multicursor handling, so the repeated command's own multicursor behavior is applied.
  multicursor: false,
  // Repeating repeat would recurse.
  repeatable: false,
  // Repeat is resolved to the last command that was executed by executeCommand and executeCommandWithMulticursor, so that the repeated command is executed through the same path as any other command. Therefore exec is never called.
  exec: noop,
}

export default repeatCommand
