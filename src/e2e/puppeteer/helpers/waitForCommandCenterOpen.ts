import { page } from '../session'

/**
 * Waits for the Command Center to be fully open and on screen. Times out after 6 seconds.
 *
 * Two conditions are required.
 * - The data-sheet-state attribute that react-modal-sheet sets on the sheet root (closed, opening, open, or closing) must be open. The sheet's container alone is not enough, because it stays mounted while the sheet slides shut, so its presence cannot tell an open Command Center from one that is being dismissed.
 * - The drawer's top edge must be inside the viewport. With zero animation durations, data-sheet-state reports open while the drawer is still below the screen, where its controls cannot be touched or measured.
 */
const waitForCommandCenterOpen = () =>
  page.waitForFunction(
    () => {
      const isSheetOpen = !!document.querySelector('[data-testid="command-center-panel"][data-sheet-state="open"]')
      const drawer = document.querySelector('[data-testid="command-menu-panel"]')
      return isSheetOpen && !!drawer && drawer.getBoundingClientRect().top < window.innerHeight
    },
    { timeout: 6000 },
  )

export default waitForCommandCenterOpen
