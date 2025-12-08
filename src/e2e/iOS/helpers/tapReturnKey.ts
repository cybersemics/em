import { Browser } from 'webdriverio'

/** Tap 'return' on the keyboard. */
const tapReturnKey = async (browser: Browser) => {
  // Use WebDriver keys command to send Return key
  // This works for web testing on iOS Safari (native context switching doesn't work for web)
  await browser.keys('Enter')
}

export default tapReturnKey
