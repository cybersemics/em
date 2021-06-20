import { Browser } from 'webdriverio'

/** Type text on the keyboard. */
const type = (browser: Browser<'async'>, text: string) => browser.sendKeys([text])

export default type
