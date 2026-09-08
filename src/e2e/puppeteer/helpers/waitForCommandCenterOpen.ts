import { page } from '../session'

/**
 * Waits for the Command Center to be fully open. Reads the data-sheet-state attribute that react-modal-sheet sets on the sheet root (closed, opening, open, or closing) rather than checking for the sheet's container, because the container stays mounted while the sheet slides shut, so its presence cannot tell an open Command Center from one that is being dismissed. Reports the state it is actually in if it never opens, which distinguishes a sheet that was never opened from one that opened and was then dismissed. Times out after 6 seconds.
 */
const waitForCommandCenterOpen = async () => {
  await expect
    .poll(
      () =>
        page.$$eval(
          '[data-testid="command-center-panel"]',
          sheets => sheets[0]?.getAttribute('data-sheet-state') ?? null,
        ),
      { timeout: 6000 },
    )
    .toBe('open')
}

export default waitForCommandCenterOpen
