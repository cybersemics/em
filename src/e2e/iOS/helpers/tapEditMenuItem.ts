/** Menu items iOS may offer, probed only to describe a failure. */
const MENU_ITEMS = ['Cut', 'Copy', 'Paste', 'Replace…', 'Look Up', 'Select All']

/** Taps an item, such as Copy or Paste, in the native iOS edit menu, which must already be shown. */
const tapEditMenuItem = async (name: string): Promise<void> => {
  const context = ((await browser.getContext()) as string) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  try {
    // The native edit menu exposes more than one element with the same name, so count matches with $$ rather than
    // WebdriverIO's strict $, which throws on more than one.
    const item = `//*[@name="${name}"]`
    try {
      await browser.waitUntil(async () => (await browser.$$(item).length) > 0, { timeout: 8000 })
    } catch {
      const shown = (
        await Promise.all(
          MENU_ITEMS.map(async menuItem =>
            (await browser.$$(`//*[@name="${menuItem}"]`).length) > 0 ? menuItem : null,
          ),
        )
      ).filter(Boolean)
      throw new Error(
        shown.length
          ? `the native edit menu offered ${shown.join(', ')} but no ${name}`
          : 'no native edit menu appeared',
      )
    }
    // The first in document order is the one that takes the tap.
    await browser.$$(item)[0].click()
  } finally {
    await browser.switchContext(context)
  }
}

export default tapEditMenuItem
