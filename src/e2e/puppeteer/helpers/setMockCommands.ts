import Command from '../../../@types/Command'
import { page } from '../setup'
import mockCommands from './mockCommands'

/** Sets mock commands for testing the GestureMenu to ensure stable snapshots regardless of command gesture changes. */
const setMockCommands = async (commands: Command[] = mockCommands): Promise<void> => {
  await page.evaluate(commands => {
    // Store mock commands in window object
    window.__mockCommands = commands
  }, commands)
}

export default setMockCommands
