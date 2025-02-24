import { Browser, Element } from 'webdriverio'

/**
 * Get editable node handle for the given value.
 */
const getEditable = (browser: Browser<'async'>, value: string): Promise<Element<'async'>> => {
  return browser.$(`//div[@data-editable and contains(text(), "${value}")]`)
}

export default getEditable
