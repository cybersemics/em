import CommandId from '../../../@types/CommandId'
import { page } from '../session'

/** Restricts the commands rendered in the Desktop Command Universe to the given command ids, so that its snapshot does not have to be updated whenever a command is added or removed. */
const stubCommandUniverse = async (commandIds: CommandId[]): Promise<void> => {
  await page.evaluate(commandIds => {
    window.em.testFlags.commandUniverseCommandIds = commandIds
  }, commandIds)
}

export default stubCommandUniverse
