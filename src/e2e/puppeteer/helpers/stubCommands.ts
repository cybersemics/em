import Command from '../../../@types/Command'
import { page } from '../session'

/** The plain data a stub command is built from, which is all a test can pass into the page. */
type StubCommand = Pick<Command, 'label' | 'gesture' | 'keyboard' | 'description'>

/** Replaces the commands the app lists and matches against gestures and keyboard shortcuts with inert commands built from plain data, so that a snapshot of a command list does not change whenever a command is added, removed, or renamed. Per-test page isolation restores the registered commands. */
const stubCommands = async (stubs: StubCommand[]): Promise<void> => {
  await page.evaluate(stubs => {
    // Typed here rather than through WindowEm, because the TDD workflow carries this helper over to a base branch that has no testHelpers.stubCommands, where it must still compile and then fail.
    const testHelpers = window.em.testHelpers as unknown as { stubCommands: (stubs: StubCommand[]) => void }
    testHelpers.stubCommands(stubs)
  }, stubs)
}

export default stubCommands
