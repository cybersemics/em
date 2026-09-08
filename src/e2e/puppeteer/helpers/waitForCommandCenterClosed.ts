import { page } from '../session'

/**
 * Waits for the Command Center to be closed, i.e. for its container to be absent from the DOM. The container is mounted by react-modal-sheet while the sheet is opening, open, or closing and unmounted once the close animation has finished, so its absence is exactly the closed state. While it is still mounted, the sheet root's data-sheet-state attribute is reported instead, which distinguishes a sheet that is wrongly open from one whose close animation simply needed longer. Times out after 6 seconds.
 */
const waitForCommandCenterClosed = async () => {
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          document.querySelector('[data-testid="command-menu-panel"]')
            ? (document.querySelector('[data-testid="command-center-panel"]')?.getAttribute('data-sheet-state') ??
              'mounted')
            : 'closed',
        ),
      { timeout: 6000 },
    )
    .toBe('closed')
}

export default waitForCommandCenterClosed
