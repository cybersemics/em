/**
 * Get the values of all thoughts currently rendered.
 * Uses the global browser object from WDIO.
 */
const getThoughts = (): Promise<string[]> =>
  browser.execute(() => Array.from(document.querySelectorAll('[data-editable]')).map(element => element.innerHTML))

export default getThoughts
