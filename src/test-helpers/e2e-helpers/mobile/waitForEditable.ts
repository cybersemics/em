import { Browser } from 'webdriverio'
import getEditable from './getEditable'
import execute from './execute'

/** Wait for editable element that contains given value. */
const waitForEditable = async(browser: Browser<'async'>, value: string) => {
  await browser.waitUntil(async () => await execute(browser, value => {
    return Array.from(document.getElementsByClassName('editable'))
      .filter(element => element.innerHTML === value).length > 0
  }, value)
  , { timeout: 11000 })
  return await getEditable(browser, value)
}

export default waitForEditable
