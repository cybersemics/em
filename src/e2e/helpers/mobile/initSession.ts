import { Browser } from 'webdriverio'
import waitForElement from '../../helpers/mobile/waitForElement'

/** Returns a function that starts a new browserstack session and skips the tutorial. The function will reload the session after the first test. */
const initSession = () => {

  const mobileBrowser = browser as unknown as Browser<'async'>
  let isFirstTest = true

  return async () => {
    // Don't reload session for the first test. webdriverio already creates a session on init.
    if (!isFirstTest) {
      await mobileBrowser.reloadSession()
    }
    else {
      isFirstTest = false
    }

    await mobileBrowser.url('http://bs-local.com:3000')
    const skipElement = await waitForElement(mobileBrowser, '#skip-tutorial')
    await skipElement.click()
  }
}

export default initSession
