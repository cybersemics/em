import { page } from '../setup'
import getFavoriteElement from './getFavoriteElement'
import hide from './hide'
import waitUntil from './waitUntil'

/** Performs Drag and Drop functionality on a favorite thought in the sidebar. */
const dragAndDropFavorite = async (
  sourceValue: string,
  destValue: string | null,
  {
    position = 'before',
    mouseUp = true,
    showAlert = false,
  }: {
    position?: 'before' | 'after'
    mouseUp?: boolean
    showAlert?: boolean
  } = {},
) => {
  try {
    const sourceElement = await getFavoriteElement(sourceValue)
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
      const destElement = await getFavoriteElement(destValue)
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

    // Hide Alert by default.
    // Otherwise wait for Alert value to appear so that snapshots are consistent.
    if (!showAlert) {
      await hide('[data-testid="alert"]')
    }
  } catch (error) {
    console.error('Drag and drop error:', error)
    throw error
  }
}

export default dragAndDropFavorite
