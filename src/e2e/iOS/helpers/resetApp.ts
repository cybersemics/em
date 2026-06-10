/**
 * Reset the app to a clean, empty thoughtspace: clear `localStorage` + `sessionStorage`, refresh, and
 * dismiss the tutorial. The single source of truth for a clean reset — the wdio suite's `beforeTest`
 * calls this, and the bridge/agent uses it mid-session (the agent reuses a session with `noReset`, so
 * thoughts, cursor, and multiselect persist between repros).
 *
 * Uses the global `browser` object from WDIO.
 */
const resetApp = async (): Promise<void> => {
  await browser.execute(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await browser.refresh()

  // After refresh with cleared storage, the Welcome/tutorial modal reappears. Dismiss it deterministically:
  // on every poll, click #skip-tutorial if present, and only report ready once the tutorial is GONE and the
  // empty thoughtspace is shown.
  //
  // Poll the DOM via execute() rather than the WebDriver element protocol (waitForExist), which can keep
  // missing the element after the WKWebView re-attaches on reload. Retrying the click each interval absorbs
  // the race where #skip-tutorial exists before fastClick's handler is attached; element.click() via the
  // WebDriver element protocol is silently ignored in the app webview, so dismiss via a DOM click.
  //
  // Do NOT treat the presence of [aria-label="empty-thoughtspace"] alone as "ready": EmptyThoughtspace
  // renders that element during the tutorial too (see its isTutorial branch), so it is present behind the
  // Welcome modal. Waiting on it directly lets beforeTest return with the tutorial still up — the source of
  // the BrowserStack flakiness this replaced. Wait for #skip-tutorial to disappear instead.
  await browser.waitUntil(
    async () =>
      browser.execute(() => {
        const skip = document.getElementById('skip-tutorial') as HTMLElement | null
        if (skip) {
          skip.click()
          return false
        }
        return !!document.querySelector('[aria-label="empty-thoughtspace"]')
      }),
    {
      timeout: 90000,
      interval: 500,
      timeoutMsg: 'tutorial was not dismissed / empty thoughtspace did not appear after reset',
    },
  )
}

export default resetApp
