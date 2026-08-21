import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import { noop } from '../constants'
import StubIcon from './StubIcon'

/** Creates a stub command with a fixed label, description, icon, and keyboard shortcut. */
const stubCommand = (n: number, command?: Partial<Command>): Command => ({
  id: `stub${n}` as CommandId,
  label: `Stub Command ${n}`,
  description: 'A stub command.',
  keyboard: { key: n.toString(), meta: true },
  multicursor: false,
  svg: StubIcon,
  exec: noop,
  ...command,
})

/** Stub commands that replace the real commands in the Desktop Command Universe when testFlags.stubCommandUniverse is enabled. They cover the appearance of the command list—executable, disabled, and overflowing rows, with and without a keyboard shortcut, and with a single-line and a wrapping description—without depending on the label, description, icon, or shortcut of any real command. */
const stubCommands: Command[] = [
  stubCommand(1),
  stubCommand(2, { keyboard: undefined }),
  stubCommand(3, { canExecute: () => false }),
  stubCommand(4, {
    description:
      'A stub command with a description that is long enough to wrap onto a second line, so that the snapshot covers multiline descriptions.',
  }),
  stubCommand(5),
  stubCommand(6),
  stubCommand(7),
  stubCommand(8),
]

export default stubCommands
