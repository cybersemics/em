import { page } from '../session'

/**
 * Waits for the Command Center to be closed, i.e. for its container to be absent from the DOM. The container is mounted by react-modal-sheet while the sheet is opening, open, or closing and unmounted once the close animation has finished, so its absence is exactly the closed state. Times out after 6 seconds.
 */
const waitForCommandCenterClosed = () =>
  page.waitForFunction(() => !document.querySelector('[data-testid="command-menu-panel"]'), { timeout: 6000 })

export default waitForCommandCenterClosed
