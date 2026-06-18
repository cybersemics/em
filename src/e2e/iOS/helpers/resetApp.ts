/** Marker set pre-reload so we can detect the stale page after browser.refresh() returns early. */
const RESET_SENTINEL = '__emResetSentinel'

/** Reset to a clean, empty thoughtspace: clear storage, refresh, dismiss the tutorial. */
const resetApp = async (): Promise<void> => {
  await browser.execute(sentinel => {
    localStorage.clear()
    sessionStorage.clear()
    // browser.refresh() can resolve before WKWebView navigates; tag the current document so the poll
    // below can tell it apart from the reloaded one.
    ;(window as unknown as Record<string, boolean>)[sentinel] = true
  }, RESET_SENTINEL)
  await browser.refresh()

  // Use execute() not the WebDriver element protocol — it can keep missing elements after WKWebView reloads.
  // Each iteration: skip if the sentinel is still set (stale page), click #skip-tutorial if present,
  // then resolve once it's gone and empty-thoughtspace is visible.
  // Can't treat empty-thoughtspace alone as ready — it also renders during the tutorial.
  await browser.waitUntil(
    async () =>
      browser.execute(sentinel => {
        if ((window as unknown as Record<string, boolean>)[sentinel]) return false
        const skip = document.getElementById('skip-tutorial') as HTMLElement | null
        if (skip) {
          skip.click()
          return false
        }
        return !!document.querySelector('[aria-label="empty-thoughtspace"]')
      }, RESET_SENTINEL),
    {
      timeout: 90000,
      interval: 500,
      timeoutMsg: 'tutorial was not dismissed / empty thoughtspace did not appear after reset',
    },
  )
}

export default resetApp
