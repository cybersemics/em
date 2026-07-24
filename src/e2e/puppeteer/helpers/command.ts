import CommandId from '../../../@types/CommandId'
import { WindowEm } from '../../../initialize'
import { page } from '../session'

/** Executes a command by id. Use in tests when the specific shortcut used to execute the command doesn't matter. This decouples the tests from the shortcuts and makes the tests more readable. */
const command = async (id: CommandId) => {
  await page.evaluate(id => {
    const em = window.em as WindowEm
    em.testHelpers.executeCommandById(id)
  }, id)
}

export default command
