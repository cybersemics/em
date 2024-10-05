import { Page } from 'puppeteer'
import sleep from '../../../util/sleep'
import getEditable from './getEditable'
import showMousePointer from './showMousePointer'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

interface DragAndDropOptions {
  /** Determines where the destination thought is dropped, relative to the source thought.
    - after: drop the source thought as a sibling after the destination thought.
    - before: drop the source thought as a sibling before the destination thought.
    - child: drop the source thought as a child of the destination thought.
   */
  position: 'after' | 'before' | 'child'
  /** If true, the mouse button is released after the drop. */
  mouseUp?: boolean
  /** If true, the source thought is dropped as a sibling to the hidden uncle. */
  dropUncle?: boolean
}

/** Performs Drag and Drop functionality on a thought in Puppeteer browser. */
const dragAndDropThought = async (
  sourceValue: string,
  destValue: string,
  { position, mouseUp, dropUncle }: DragAndDropOptions,
) => {
  const page = global.page

  const sourceElement = await getEditable(sourceValue)
  const destElement = await getEditable(destValue)

  if (!sourceElement.boundingBox) {
    console.error({ sourceElement, sourceValue, destElement, destValue })
    throw new Error('Source element has no bounding box')
  } else if (!destElement.boundingBox) {
    console.error({ sourceElement, sourceValue, destElement, destValue })
    throw new Error('Drag element has no bounding box')
  }

  const dragStart = await sourceElement.boundingBox()
  const dragEnd = await destElement.boundingBox()

  await showMousePointer()

  if (!dragStart) {
    throw new Error('Drag source element not found')
  } else if (!dragEnd) {
    throw new Error('Drag destination element not found')
  }

  // If the position is 'before', the yOffset is 0
  // because the drop target will be just above the thought otherwise it will be 20 so it is dragged after the thought
  const yOffset = position === 'before' ? 0 : 20

  // If the position is 'child', make the initial click to the right so that it lands on the DropChild drop target.
  // Must exceed the DropChild's drop-end margin-left.
  const fontSize = 18 // TODO: Get the font size from the CSS
  const xOffset = position === 'child' ? fontSize * 2.9 - 2 : 0

  // Calculate center positions of the elements
  const dragPosition = {
    // -5 to avoid the caret to be on the thought
    // because otherwise it will be selected and any expanded thought will collapse
    x: dragStart.x + 1 - 5,
    y: dragStart.y + 1,
  }
  const dropPosition = {
    // In table view parent and column one are aligned, if we are dropping after column one, we need to move to the right
    x: dropUncle ? dragEnd.x + xOffset : dragEnd.x + dragEnd.width / 1.25 + xOffset,
    // if we are dropping to the hidden uncle, we need to move to the bottom of the thought to trigger DropUncle instead of normal middle height
    y: dropUncle ? dragEnd.y + dragEnd.height : dragEnd.y + dragEnd.height / 2 + yOffset,
  }

  // Move the mouse to the drag target, then press, move to the drop target, and release
  await page.mouse.move(dragPosition.x, dragPosition.y)
  await page.mouse.down()
  await page.mouse.move(dropPosition.x, dropPosition.y)
  if (mouseUp) await page.mouse.up()

  await sleep(500)
}

export default dragAndDropThought
