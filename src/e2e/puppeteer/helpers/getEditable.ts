import { page } from '../session'

/**
 * Get editable node handle for the given value. An empty value gets the first empty thought.
 */
const getEditable = (value: string) =>
  page.evaluateHandle(value => {
    // every string contains the empty string, so an empty value would otherwise match the first thought of any value
    const xpath = value
      ? `//div[@data-editable and contains(text(), "${value}")]`
      : '//div[@data-editable and not(node())]'
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue as HTMLElement
  }, value)

export default getEditable
