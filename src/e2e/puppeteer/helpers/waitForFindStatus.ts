import { page } from '../session'

/** The text of the find bar's status, e.g. '2 of 4' or 'No matches', or null when the find bar is closed. */
const findStatus = () => document.querySelector('[role=search] [role=status]')?.textContent ?? null

/** Waits for the find bar to show the given status, e.g. '2 of 4' or 'No matches'. Fails with the status it showed instead. */
const waitForFindStatus = async (status: string) => {
  try {
    await page.waitForFunction(
      (status: string) => document.querySelector('[role=search] [role=status]')?.textContent === status,
      { timeout: 2000 },
      status,
    )
  } catch {
    const shown = await page.evaluate(findStatus)
    throw new Error(
      `Expected the find bar to show "${status}", but ${shown === null ? 'it was closed' : `it showed "${shown}"`}.`,
    )
  }
}

export default waitForFindStatus
