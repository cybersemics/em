import CommandLabel from '../../../@types/CommandLabel'
import { page } from '../session'
import press from './press'
import waitForSelector from './waitForSelector'

/**
 * Executes a command through the Command Universe, as the user does. It is a real entry point, so it can be the act of
 * a test that covers the Command Universe, or arrange a command incidentally when the test should not be coupled to the
 * command's keyboard shortcut. The inputType option names the entry point at the call site; the Command Universe is the
 * only one so far.
 *
 * The command is named by label rather than by id, because the palette is searched by label and there is nowhere to
 * resolve one to the other. Importing the commands here pulls the Redux store into the test process, where building
 * initialState reads window.location and throws; and reading the label through window.em would put the lookup in
 * application code, which the TDD workflow does not carry over to the base branch, so the helper would not compile
 * there.
 */
const command = async (label: CommandLabel, options: { inputType: 'commandPalette' }): Promise<void> => {
  await press('P', { meta: true })
  await waitForSelector('[data-testid=desktop-command-universe]')
  await page.keyboard.type(label)
  await press('Enter')
}

export default command
