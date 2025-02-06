import sleep from '../../../util/sleep'
import { page } from '../setup'
import getEditable from './getEditable'
import hide from './hide'
import showMousePointer from './showMousePointer'
import waitUntil from './waitUntil'

/** Performs Drag and Drop functionality on a thought in Puppeteer browser. */
const dragAndDropThought = async (
  sourceValue: string,
  /** The value of the thought to drop at. Use the position absolute to control whether to drop before, after, etc. If null, only initiates the drag and move the mouse. */
  destValue: string | null,
  {
    dropUncle,
    mouseUp,
    position,
    showAlert,
    showQuickDropPanel,
  }: {
    /** If true, the source thought is dropped as a sibling to the hidden uncle. */
    dropUncle?: boolean
    /** If true, the mouse button is released after the drop. */
    mouseUp?: boolean
    /** Determines where the destination thought is dropped, relative to the source thought.
    - after: drop the source thought as a sibling after the destination thought.
    - before: drop the source thought as a sibling before the destination thought.
    - child: drop the source thought as a child of the destination thought.
    - none: only valid when destValue is null and not dropping.
     */
    position: 'after' | 'before' | 'child' | 'none'
    /** Show the drag-and-drop Alert. Hidden by default. */
    showAlert?: boolean
    /** Show the QuickDropPanel. Hidden by default. */
    showQuickDropPanel?: boolean
  },
) => {
  const sourceElement = await getEditable(sourceValue)

  if (!sourceElement.boundingBox) {
    console.error({ sourceElement, sourceValue, destValue })
    throw new Error('Source element has no bounding box')
  }

  const dragStart = await sourceElement.boundingBox()
  if (!dragStart) {
    throw new Error('Drag source element not found')
  }

  await showMousePointer()

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

  // move the mouse to the drag target, then press
  await page.mouse.move(dragPosition.x, dragPosition.y)
  await page.mouse.down()

  // move to the drop target, and release
  if (destValue) {
    const destElement = await getEditable(destValue)
    if (!destElement.boundingBox) {
      console.error({ sourceElement, sourceValue, destElement, destValue })
      throw new Error('Drag element has no bounding box')
    }

    const dragEnd = await destElement?.boundingBox()
    if (!dragEnd) {
      throw new Error('Drag destination element not found')
    }

    const dropPosition = {
      // In table view parent and column one are aligned, if we are dropping after column one, we need to move to the right
      x: dropUncle ? dragEnd.x + xOffset : dragEnd.x + dragEnd.width / 1.25 + xOffset,
      // if we are dropping to the hidden uncle, we need to move to the bottom of the thought to trigger DropUncle instead of normal middle height
      y: dropUncle ? dragEnd.y + dragEnd.height : dragEnd.y + dragEnd.height / 2 + yOffset,
    }

    await page.mouse.move(dropPosition.x, dropPosition.y)
  }

  await page.locator('[data-testid="quick-drop-panel"]').wait()
  await page.locator('[data-testid="alert-content"]').wait()

  if (mouseUp) {
    await page.mouse.up()
    await waitUntil(() => !document.querySelector('[data-drag-in-progress="true"]'))

    // TODO: Why does drop/DragAndDropThought test fails intermittently without a small delay?
    // QuickDropPanel and bullet highlight are visible.
    await sleep(500)
  }

  // Hide QuickDropPanel by defafult.
  // Otherwise wait for QuickDropPanel  to appear so that snapshots are consistent.
  if (!showQuickDropPanel) {
    await hide('[data-testid="quick-drop-panel"]')
  }

  // Hide Alert by default.
  // Otherwise wait for Alert value to appear so that snapshots are consistent.
  if (!showAlert) {
    await hide('[data-testid="alert"]')
  }
}

export default dragAndDropThought
