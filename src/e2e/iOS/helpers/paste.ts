import { HOME_TOKEN } from '../../../constants.js'
import equalPath from '../../../util/equalPath'

async function paste(text: string): Promise<void>
async function paste(pathUnranked: string[], text: string): Promise<void>

/** Import text on given unranked path using exposed testHelpers. */
async function paste(pathUnranked: string | string[], text?: string): Promise<void> {
  const _pathUnranked = typeof pathUnranked === 'string' ? [HOME_TOKEN] : (pathUnranked as string[])
  const _text = typeof pathUnranked === 'string' ? pathUnranked : text!

  // Capture the cursor before import to detect when it changes
  const cursorBefore = await browser.execute(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const em = (window as any).em
    const state = em?.testHelpers?.getState?.()
    return state?.cursor || null
  })

  // Note: This helper is exposed because copy paste doesn't work in headless mode.
  // Access window.em inside browser.execute() since window doesn't exist in Node context
  await browser.execute(
    (_pathUnranked: string[], _text: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const em = (window as any).em
      em.testHelpers.importToContext(_pathUnranked, _text)
    },
    _pathUnranked,
    _text,
  )

  // Wait for the import to complete by checking if the cursor has changed or been set.
  // importText sets the cursor to the last imported thought, so we wait for the cursor to change
  // (if it was already set) or to be set to a non-null value (if it was null).
  await browser.waitUntil(
    async () => {
      const cursorAfter = await browser.execute(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const em = (window as any).em
        const state = em?.testHelpers?.getState?.()
        return state?.cursor || null
      })

      // Cursor is set/changed when import completes (importText always sets cursor unless preventSetCursor is true)
      // If cursor was null before, wait for it to be set. If it was set before, wait for it to change.
      return !equalPath(cursorAfter, cursorBefore)
    },
    {
      timeout: 10000,
    },
  )
}

export default paste
