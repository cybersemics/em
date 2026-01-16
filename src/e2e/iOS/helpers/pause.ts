/**
 * Pause execution for the given number of milliseconds.
 * Uses the global browser object from WDIO.
 */
const pause = async (milliseconds: number) => {
  await browser.pause(milliseconds)
}

export default pause
