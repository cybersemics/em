/**
 * Waits for the Command Center to be fully open. Reads the data-sheet-state attribute that react-modal-sheet
 * sets on the sheet root (closed, opening, open, or closing) rather than checking for the sheet's container,
 * because the container stays mounted while the sheet slides shut, so its presence cannot tell an open Command
 * Center from one that is being dismissed.
 *
 * Uses the global `browser` object from WDIO.
 */
const waitForCommandCenterOpen = (): Promise<true | void> =>
  browser.waitUntil(
    () =>
      browser.execute(() => !!document.querySelector('[data-testid="command-center-panel"][data-sheet-state="open"]')),
    { timeout: 10000, interval: 250, timeoutMsg: 'the Command Center did not open' },
  )

export default waitForCommandCenterOpen
