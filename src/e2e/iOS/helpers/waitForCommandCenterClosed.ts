/**
 * Waits for the Command Center to be closed, reading the data-sheet-state attribute that react-modal-sheet
 * sets on the sheet root. The root stays mounted while the sheet slides shut, so its absence is not the closed
 * state; any state other than open is.
 *
 * Uses the global `browser` object from WDIO.
 */
const waitForCommandCenterClosed = (): Promise<true | void> =>
  browser.waitUntil(
    () =>
      browser.execute(() => !document.querySelector('[data-testid="command-center-panel"][data-sheet-state="open"]')),
    {
      timeout: 10000,
      interval: 250,
      timeoutMsg: 'the Command Center did not close',
    },
  )

export default waitForCommandCenterClosed
