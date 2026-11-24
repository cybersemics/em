import { page } from '../session'

/**
 * Helper to find favorite item by text value.
 * Uses XPath to find the thought-link with exact text, not in breadcrumbs, within drag-and-drop-favorite.
 */
const findFavoriteItem = async (value: string) => {
  return page.evaluateHandle(value => {
    // XPath to find thought-link with exact text value which is not in breadcrumbs but just within drag-and-drop-favorite
    const xpath = `//*[@data-testid='drag-and-drop-favorite'][.//*[@data-thought-link and not(ancestor::*[@aria-label='context-breadcrumbs']) and normalize-space()='${value}']]`

    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue as HTMLElement
  }, value)
}

export default findFavoriteItem
