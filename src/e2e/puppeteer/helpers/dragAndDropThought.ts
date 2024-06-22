import { Page } from 'puppeteer'
import sleep from '../../../util/sleep'
import getEditable from './getEditable'

interface DragAndDropOptions {
  /** Determines where the destination thought is dropped, relative to the source thought.
    - after: drop the source thought as a sibling after the destination thought.
    - before: drop the source thought as a sibling before the destination thought.
    - child: drop the source thought as a child of the destination thought.
   */
  position: 'after' | 'before' | 'child'
}

/** Performs Drag and Drop functionality on a thought in Puppeteer browser. */
const dragAndDropThought = async (
  page: Page,
  sourceValue: string,
  destValue: string,
  { position }: DragAndDropOptions,
) => {
  if (position === 'before') {
    throw new Error('Not implemented')
  } else if (position === 'child') {
    throw new Error('Not implemented')
  }

  const sourceElement = await getEditable(page, sourceValue)
  const destElement = await getEditable(page, destValue)

  const dragStart = await sourceElement.boundingBox()
  const dragEnd = await destElement.boundingBox()

  if (!dragStart) {
    throw new Error('Drag source element not found')
  } else if (!dragEnd) {
    throw new Error('Drag destination element not found')
  }

  // Offset to add to drop destination y position so it is dragged exactly on top of the drop traget.
  // Otherwise it falls short, just above the drop target.
  const yOffset = 20

  // Calculate center positions of the elements
  const dragPosition = {
    x: dragStart.x,
    y: dragStart.y,
  }
  const dropPosition = {
    x: dragEnd.x + dragEnd.width / 2,
    y: yOffset + dragEnd.y + dragEnd.height / 2,
  }

  // Move the mouse to the drag target, then press, move to the drop target, and release
  await page.mouse.move(dragPosition.x, dragPosition.y)
  await page.mouse.down()
  await page.mouse.move(dropPosition.x, dropPosition.y, { steps: 10 })
  await page.mouse.up()

  await sleep(500)
}

export default dragAndDropThought
