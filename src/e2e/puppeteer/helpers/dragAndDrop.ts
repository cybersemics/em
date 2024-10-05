import { Page } from 'puppeteer'

declare module global {
  const page: Page
}

/** Performs Drag and Drop functionality in Puppeteer browser. */
const dragAndDrop = async (selectorDrag: string, selectorDrop: string) => {
  const page = global.page

  // Get the bounding boxes of the drag and drop targets
  const dragStart = await page.$eval(selectorDrag, el => ({
    x: el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2,
    y: el.getBoundingClientRect().y + el.getBoundingClientRect().height / 2,
  }))

  const dragEnd = await page.$eval(selectorDrop, el => ({
    x: el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2,
    y: el.getBoundingClientRect().y + el.getBoundingClientRect().height / 2,
  }))

  // Move the mouse to the drag target, then press, move to the drop target, and release
  await page.mouse.move(dragStart.x, dragStart.y)
  await page.mouse.down()
  await page.mouse.move(dragEnd.x, dragEnd.y)
  await page.mouse.up()
}

export default dragAndDrop
