/**
 * Waits for exactly the given number of thoughts to be selected by the multiselect, reading the highlighted
 * bullets. Reports how many were actually highlighted on timeout, so a gesture that did not register is
 * distinguishable from one that selected the wrong range.
 *
 * Uses the global `browser` object from WDIO.
 */
const waitForMulticursor = async (n: number): Promise<void> => {
  /** Counts the bullets the multiselect has highlighted. */
  const highlighted = () =>
    browser.execute(() => document.querySelectorAll('[aria-label="bullet"][data-highlighted="true"]').length)

  try {
    await browser.waitUntil(async () => (await highlighted()) === n, { timeout: 10000, interval: 250 })
  } catch {
    throw new Error(`Expected ${n} thoughts to be selected, but ${await highlighted()} were.`)
  }
}

export default waitForMulticursor
