import { Browser, Element } from 'webdriverio'

/**
 * Get editable node handle for the given value.
 */
const getEditable = (browser: Browser, value: string): Promise<Element> => {
  return browser.$(`//div[@data-editable and contains(text(), "${value}")]`).getElement()
}

export default getEditable
