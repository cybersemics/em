import { Browser } from 'webdriverio'

/** Type text on the keyboard. */
const keyboard = {
  type: (browser: Browser, text: string) => browser.sendKeys([text]),
}

export default keyboard
