/**
 * Performs a querySelector on the document.
 * Uses the global browser object from WDIO.
 */
const $ = (selector: string) => browser.$(selector)

export default $
