import { Page } from 'puppeteer'
import getEditable from './getEditable'

/** PErforms Drag and Drop functionality on a hought in Puppeteer browser. */
const dragAndDropThought = async (page: Page, sourceValue: string, destValue: string) => {
  const sourceElement = await getEditable(page, sourceValue)
  const destElement = await getEditable(page, destValue)

  const dragStart = await sourceElement.boundingBox()
  const dragEnd = await destElement.boundingBox()

  if (!dragStart || !dragEnd) {
    return
  }

  const yOffset = 20 // Adding offset to drop destination y position so it is dragged exactly on top of it. Right now it fall short just above the drop target

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
}

export default dragAndDropThought
