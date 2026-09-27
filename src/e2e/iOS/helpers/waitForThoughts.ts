import exportThoughts from './exportThoughts'

/**
 * Waits for the exported thoughts to equal the given outline.
 *
 * The wait is the assertion, so a timeout reports the thoughts that were actually exported rather than the bare
 * timeout message, which would say nothing about what went wrong.
 */
const waitForThoughts = async (expected: string): Promise<void> => {
  let exported = ''
  try {
    await browser.waitUntil(async () => {
      exported = await exportThoughts()
      return exported === expected
    })
  } catch {
    throw new Error(`Expected the thoughts ${JSON.stringify(expected)}, but got ${JSON.stringify(exported)}.`)
  }
}

export default waitForThoughts
