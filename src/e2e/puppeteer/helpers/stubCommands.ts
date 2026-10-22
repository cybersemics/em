import { page } from '../session'

/** A fixed list of commands, enough to fill multiple columns of the Gesture Menu at a wide viewport. */
const STUB_COMMANDS = [
  'r',
  'rd',
  'ru',
  'rl',
  'rdr',
  'rdl',
  'rur',
  'rul',
  'rdu',
  'rud',
  'rld',
  'rlu',
  'rdrd',
  'rurd',
  'rldr',
  'rulu',
].map((gesture, i) => ({
  label: `Command ${i + 1}`,
  gesture,
  description: `Description of command ${i + 1}.`,
}))

/** Replaces the global commands with a fixed list, so that a snapshot of a command list does not need to be updated whenever a command is added, removed, or renamed. The stubs replace the registered commands everywhere the app lists or matches commands. Per-test page isolation restores the registered commands. See docs/commands.md#stubbing-the-global-commands. */
const stubCommands = async (): Promise<void> => {
  await page.evaluate(commands => {
    window.em.testHelpers.stubCommands(commands)
  }, STUB_COMMANDS)
}

export default stubCommands
