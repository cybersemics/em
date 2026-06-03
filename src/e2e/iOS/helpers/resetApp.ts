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

  // After refresh, poll the DOM via execute() — robust against the WKWebView re-attaching on reload,
  // where the WebDriver element protocol (waitForExist) can keep missing the element even once it exists.
  // Clearing storage brings the welcome screen back; dismiss it with a DOM click (element.click() is
  // silently ignored in the app webview), then confirm the empty thoughtspace.
  await browser.waitUntil(
    async () =>
      browser.execute(
        () =>
          !!document.getElementById('skip-tutorial') || !!document.querySelector('[aria-label="empty-thoughtspace"]'),
      ),
    { timeout: 30000, interval: 500, timeoutMsg: 'app did not return to the welcome/empty screen after reset' },
  )
  await browser.execute(() => (document.getElementById('skip-tutorial') as HTMLElement | null)?.click())
  await browser.waitUntil(
    async () => browser.execute(() => !!document.querySelector('[aria-label="empty-thoughtspace"]')),
    {
      timeout: 30000,
      interval: 500,
      timeoutMsg: 'empty thoughtspace did not appear after reset',
    },
  )
}

export default resetApp
