import { Browser } from 'webdriverio'
import waitForEditable from './waitForEditable'

/** Send keys and wait for editable exists for the given values. */
const sendKeysForThought = async (browser: Browser<'async'>, keys: string[]) => {
  await browser.sendKeys(keys)
  await Promise.all(keys.map(key => waitForEditable(browser, key)))
}

export default sendKeysForThought
