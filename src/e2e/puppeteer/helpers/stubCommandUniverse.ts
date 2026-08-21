import { page } from '../session'

/** Replaces the commands in the Desktop Command Universe with stub commands, so that its snapshot only covers the appearance of the command list and does not have to be updated whenever a command is added, removed, or edited. */
const stubCommandUniverse = async (): Promise<void> => {
  await page.evaluate(() => {
    window.em.testFlags.stubCommandUniverse = true
  })
}

export default stubCommandUniverse
