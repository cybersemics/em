import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import paste from '../helpers/paste'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

// https://github.com/cybersemics/em/issues/5221
it('Import opens the file picker, for one or more files', async () => {
  await paste(`
    - a
  `)
  await clickThought('a')

  // The browser only opens the picker while it handles a user gesture, so the command is run as the user runs it.
  // The wait starts before the Command Universe opens, so it allows for opening it and typing the command as well.
  // The rejection is handled at once, so that a failure to open the Command Universe does not leave it unhandled.
  const filePicker = page.waitForFileChooser({ timeout: 10000 }).catch(() => null)
  await command('Import', { inputType: 'commandPalette' })
  const picker = await filePicker
  if (!picker) throw new Error('Expected Import to open the file picker, but none opened.')

  expect(picker.isMultiple()).toBe(true)
  await picker.cancel()
})
