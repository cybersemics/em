import { page } from '../session'

/**
 * Reset the app to a clean, empty thoughtspace: clear `localStorage` + `sessionStorage`, reload, and
 * dismiss the tutorial. The canonical way to get clean state mid-session when reusing a page — e.g. the
 * agent bridge, which attaches to a long-lived tab rather than a fresh per-test context.
 */
const resetApp = async (): Promise<void> => {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()

  // Clearing storage brings the welcome screen back; dismiss it with a DOM click (robust across the
  // desktop and mobile-emulation profiles).
  await page.waitForSelector('#skip-tutorial')
  await page.evaluate(() => (document.getElementById('skip-tutorial') as HTMLElement | null)?.click())
  await page.waitForFunction(() => !!document.querySelector('[aria-label="empty-thoughtspace"]'))
}

export default resetApp
