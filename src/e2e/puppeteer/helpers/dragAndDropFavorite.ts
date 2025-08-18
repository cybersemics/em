import { page } from '../setup'
import waitUntil from './waitUntil'

/**
 * Helper to find favorite item by text value.
 * Uses XPath to find the thought-link with exact text, not in breadcrumbs, within favorite-item.
 */
const findFavoriteItem = async (value: string) => {
  return await page.evaluateHandle(value => {
    // XPath to find thought-link with exact text value which is not in breadcrumbs but just within favorite-item
    const xpath = `//*[@data-testid='favorite-item']//*[@data-thought-link and not(ancestor::*[@aria-label='context-breadcrumbs']) and normalize-space()='${value.toLowerCase()}']/ancestor::*[@data-testid='favorite-item']`

    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue as HTMLElement
  }, value)
}

/** Performs Drag and Drop functionality on a favorite thought in the sidebar. */
const dragAndDropFavorite = async (
  sourceValue: string,
  destValue: string | null,
  {
    position = 'before',
    mouseUp = true,
  }: {
    position?: 'before' | 'after'
    mouseUp?: boolean
  } = {},
) => {
  try {
    const sourceElement = await findFavoriteItem(sourceValue)
    if (!sourceElement.boundingBox) {
      console.error({ sourceElement, sourceValue, destValue })
      throw new Error('Source element has no bounding box')
    }

    const dragStart = await sourceElement.boundingBox()
    if (!dragStart) throw new Error('Drag source element not found')

    // Calculate center of source element
    const dragPosition = {
      x: dragStart.x + dragStart.width / 2,
      y: dragStart.y + dragStart.height / 2,
    }

    await page.mouse.move(dragPosition.x, dragPosition.y)
    await page.mouse.down()

    if (destValue) {
      const destElement = await findFavoriteItem(destValue)
      if (!destElement.boundingBox) {
        console.error({ destElement, destValue })
        throw new Error('Destination element has no bounding box')
      }

      const dragEnd = await destElement.boundingBox()
      if (!dragEnd) throw new Error('Drag destination element not found')

      // Calculate drop position
      const dropPosition = {
        x: dragEnd.x + dragEnd.width / 2,
        y: position === 'before' ? dragEnd.y : dragEnd.y + dragEnd.height,
      }

      await page.mouse.move(dropPosition.x, dropPosition.y)
    }

    await page.locator('[data-drag-in-progress="true"]').wait()

    if (mouseUp) {
      await page.mouse.up()
      await waitUntil(() => !document.querySelector('[data-drag-in-progress="true"]'))
    }
  } catch (error) {
    console.error('Drag and drop error:', error)
    throw error
  }
}

export default dragAndDropFavorite
