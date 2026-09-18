/**
 * Waits for exactly the given number of thoughts to render the given html. Reports how many were actually
 * found on timeout, since a paste that dropped its formatting renders the text without the markup and would
 * otherwise time out without saying what it produced instead.
 *
 * Uses the global `browser` object from WDIO.
 */
const waitForEditableCount = async (html: string, n: number): Promise<void> => {
  /** Counts the editables whose html matches exactly. */
  const count = (value: string) =>
    browser.execute(
      (value: string) =>
        Array.from(document.querySelectorAll('[data-editable]')).filter(el => el.innerHTML === value).length,
      value,
    )

  try {
    await browser.waitUntil(async () => (await count(html)) === n, { timeout: 10000, interval: 250 })
  } catch {
    const rendered = await browser.execute(() =>
      Array.from(document.querySelectorAll('[data-editable]')).map(el => el.innerHTML),
    )
    throw new Error(
      `Expected ${n} thoughts to render ${html}, but found ${await count(html)}. Rendered: ${JSON.stringify(rendered)}`,
    )
  }
}

export default waitForEditableCount
