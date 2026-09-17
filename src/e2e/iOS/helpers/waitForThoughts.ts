import getThoughts from './getThoughts'

/**
 * Waits for exactly the given thoughts to be rendered, in order.
 *
 * The wait is the assertion, so a timeout reports the thoughts that were actually rendered rather than the bare
 * timeout message, which would say nothing about what went wrong.
 */
const waitForThoughts = async (expected: string[]): Promise<void> => {
  try {
    await browser.waitUntil(async () => {
      const thoughts = await getThoughts()
      return thoughts.length === expected.length && thoughts.every((thought, i) => thought === expected[i])
    })
  } catch {
    throw new Error(
      `Expected the thoughts ${JSON.stringify(expected)} to be rendered, but ${JSON.stringify(await getThoughts())} were rendered.`,
    )
  }
}

export default waitForThoughts
