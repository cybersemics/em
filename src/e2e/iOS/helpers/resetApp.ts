/** Marker set on the document before reload so resetApp can tell the freshly reloaded page from the stale one. */
const RESET_SENTINEL = '__emResetSentinel'

/**
 * Reset the app to a clean, empty thoughtspace: clear `localStorage` + `sessionStorage`, refresh, and
 * dismiss the tutorial. The single source of truth for a clean reset — the wdio suite's `beforeTest`
 * calls this, and the bridge/agent uses it mid-session (the agent reuses a session with `noReset`, so
 * thoughts, cursor, and multiselect persist between repros).
 *
 * Uses the global `browser` object from WDIO.
 */
const resetApp = async (): Promise<void> => {
  await browser.execute(sentinel => {
    localStorage.clear()
    sessionStorage.clear()
    // Tag the current document. browser.refresh() can resolve before the WKWebView has navigated, so the
    // pre-reload DOM stays briefly queryable; the reloaded document won't carry this tag (see the wait below).
    ;(window as unknown as Record<string, boolean>)[sentinel] = true
  }, RESET_SENTINEL)
  await browser.refresh()

  // Dismiss the tutorial deterministically in a single resilient poll. On every interval:
  //   1. If the sentinel is still set, we're looking at the pre-reload page (refresh() returns before the
  //      WKWebView navigates) — keep waiting. This is the load-bearing guard: without it the poll can act on
  //      the prior test's DOM, which after most tests still shows [aria-label="empty-thoughtspace"], and
  //      return immediately on a page that is about to be torn down — the BrowserStack flakiness this replaced.
  //   2. Once on the reloaded page, click #skip-tutorial if present (retrying each interval absorbs the race
  //      where the element exists before fastClick's handler is attached). element.click() via the WebDriver
  //      element protocol is silently ignored in the app webview, so dismiss via a DOM click.
  //   3. Report ready only once #skip-tutorial is GONE and the empty thoughtspace is shown. Do NOT treat the
  //      presence of [aria-label="empty-thoughtspace"] alone as ready: EmptyThoughtspace renders that element
  //      during the tutorial too (see its isTutorial branch), so it is present behind the Welcome modal.
  //
  // Poll the DOM via execute() (returning only primitives) rather than the WebDriver element protocol
  // (waitForExist), which can keep missing the element after the WKWebView re-attaches on reload.
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
