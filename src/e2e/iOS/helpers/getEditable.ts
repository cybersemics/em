import { Element } from 'webdriverio'

/**
 * Get the editable node handle whose text is exactly the given value. Matching a substring would also match every
 * thought that contains the value, e.g. getEditable('') would match every thought.
 */
const getEditable = (value: string): Promise<Element> => {
  return browser.$(`//div[@data-editable and .="${value}"]`).getElement()
}

export default getEditable
