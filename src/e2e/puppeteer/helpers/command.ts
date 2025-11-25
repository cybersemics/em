import CommandId from '../../../@types/CommandId'
import { WindowEm } from '../../../initialize'
import { page } from '../setup'

const em = window.em as WindowEm

/** Executes a command by id. Use in tests when the specific shortcut used to execute the command doesn't matter. This decouples the tests from the shortcuts and makes the tests more readable. */
const command = async (id: CommandId) =>
  page.evaluate(id => {
    em.testHelpers.executeCommandById(id)
  }, id)

export default command
