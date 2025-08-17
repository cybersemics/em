import sleep from '../../../util/sleep'
import { page } from '../setup'
import getFavoriteElement from './getFavoriteElement'
import waitUntil from './waitUntil'

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
    const sourceElement = await getFavoriteElement(sourceValue)
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
      const dragEnd = await destElement.boundingBox()
      if (!dragEnd) throw new Error('Drag destination element not found')

      // Calculate drop position
      const dropPosition = {
        x: dragEnd.x + dragEnd.width / 2,
        y: position === 'before' ? dragEnd.y : dragEnd.y + dragEnd.height,
      }

      await page.mouse.move(dropPosition.x, dropPosition.y)
    }

    if (mouseUp) {
      await page.mouse.up()
      await waitUntil(() => !document.querySelector('[data-drag-in-progress="true"]'))
      // sleep to ensure the drop is complete
      await sleep(500)
    }
  } catch (error) {
    console.error('Drag and drop error:', error)
    throw error
  }
}

export default dragAndDropFavorite
