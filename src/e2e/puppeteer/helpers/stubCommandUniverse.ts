import Command from '../../../@types/Command'
import CommandId from '../../../@types/CommandId'
import { page } from '../session'

/** Replaces the commands in the Desktop Command Universe with stub commands, so that its snapshot covers only the appearance of the command list and does not have to be updated whenever a command is added, removed, or edited. The stubs cover executable, disabled, and overflowing rows, with and without a keyboard shortcut, and with a single-line and a wrapping description. */
const stubCommandUniverse = async (): Promise<void> => {
  await page.evaluate(() => {
    /** Creates a stub command with a fixed label, description, and keyboard shortcut. */
    const stubCommand = (n: number, command?: Partial<Command>): Command => ({
      id: `stub${n}` as CommandId,
      label: `Stub Command ${n}`,
      description: 'A stub command.',
      keyboard: { key: n.toString(), meta: true },
      multicursor: false,
      exec: () => {},
      ...command,
    })

    window.em.testFlags.commandUniverseCommands = [
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
  })
}

export default stubCommandUniverse
