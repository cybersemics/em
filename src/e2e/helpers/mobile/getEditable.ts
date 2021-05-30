import { Browser } from 'webdriverio'

/**
 * Get editable node handle for the given value.
 */
const getEditable = (browser: Browser<'async'>, value: string) => {
  return browser.$(`//div[contains(@class,"editable") and contains(text(), "${value}")]`)
}

export default getEditable
