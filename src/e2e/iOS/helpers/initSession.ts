import { Browser } from 'webdriverio'
import waitForElement from '../helpers/waitForElement'
import resetSafariFormatSettings from './resetSafariFormatSettings'
import tap from './tap'

/** Returns a function that starts a new browserstack session and skips the tutorial. The function will reload the session after the first test. */
const initSession = (): (() => Promise<Browser<'async'>>) => {
  const mobileBrowser = browser as unknown as Browser<'async'>
  let isFirstTest = true

  return async () => {
    // Don't reload session for the first test. webdriverio already creates a session on init.
    if (!isFirstTest) {
      await mobileBrowser.reloadSession()
    } else {
      isFirstTest = false
    }

    await mobileBrowser.url('http://bs-local.com:3000')
    await resetSafariFormatSettings(mobileBrowser)
    const skipElement = await waitForElement(mobileBrowser, '#skip-tutorial', { timeout: 90000 })
    await mobileBrowser.waitUntil(async () => await skipElement.isClickable())
    await tap(mobileBrowser, skipElement)
    // await skipElement.click()
    await waitForElement(mobileBrowser, '.new-thought-instructions', { timeout: 90000 })
    return mobileBrowser
  }
}

export default initSession
