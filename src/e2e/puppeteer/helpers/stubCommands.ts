import Command from '../../../@types/Command'
import { page } from '../session'

/** Replaces the commands the app lists and matches against gestures and keyboard shortcuts with inert commands built from plain data, so that a snapshot of a command list does not change whenever a command is added, removed, or renamed. Per-test page isolation restores the registered commands. */
const stubCommands = async (
  stubs: Pick<Command, 'label' | 'gesture' | 'keyboard' | 'description'>[],
): Promise<void> => {
  await page.evaluate(stubs => {
    const em = window.em
    em.testHelpers.stubCommands(stubs)
  }, stubs)
}

export default stubCommands
