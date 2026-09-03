import CommandId from '../../../@types/CommandId'
import CommandLabel from '../../../@types/CommandLabel'
import { page } from '../session'
import press from './press'
import waitForSelector from './waitForSelector'

/** Executes a command directly by id, bypassing whatever triggers are bound to it. Use it when the trigger is incidental to what the test covers, since it decouples the test from the shortcuts. */
async function command(id: CommandId): Promise<void>

/**
 * Executes a command through the Command Universe, as the user does. This goes through a real trigger, so it belongs in
 * the act of a test that covers the Command Universe rather than in setup.
 *
 * The command is named by label rather than by id, because the palette is searched by label and there is nowhere to
 * resolve one to the other. Importing the commands here pulls the Redux store into the test process, where building
 * initialState reads window.location and throws; and reading the label through window.em would put the lookup in
 * application code, which the TDD workflow does not carry over to the base branch, so the helper would not compile
 * there.
 */
async function command(label: CommandLabel, options: { inputType: 'commandPalette' }): Promise<void>

/** Executes a command, directly or through the Command Universe. */
async function command(idOrLabel: CommandId | CommandLabel, options?: { inputType: 'commandPalette' }): Promise<void> {
  if (options?.inputType === 'commandPalette') {
    await press('P', { meta: true })
    await waitForSelector('[data-testid=desktop-command-universe]')
    await page.keyboard.type(idOrLabel)
    await press('Enter')
    return
  }

  // narrowed by the overloads: with no inputType the argument is an id
  await page.evaluate(id => {
    const em = window.em
    em.testHelpers.executeCommandById(id as CommandId)
  }, idOrLabel)
}

export default command
