import { page } from '../setup'

/**
 * Get editable node handle for the given value.
 */
const getEditable = (value: string) =>
  page.evaluateHandle(value => {
    const xpath = `//div[@data-editable and contains(text(), "${value}")]`
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue as HTMLElement
  }, value)

export default getEditable
