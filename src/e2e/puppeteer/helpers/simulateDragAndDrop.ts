import { Page } from 'puppeteer'

/** Simulates Drag and Drop functionality in Puppeteer. */
const dragAndDrop = async (page: Page, selectorDrag: string) => {
  await page.evaluate(() => {
    const thoughts = document.querySelectorAll('[aria-label="thought"]')
    thoughts.forEach((thought, index) => {
      // Assign an ID
      thought.id = `thought-${index}`
    })
  })

  // Get the bounding boxes of the drag and drop targets
  const dragStart = await page.$eval(selectorDrag, el => ({
    x: el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2,
    y: el.getBoundingClientRect().y + el.getBoundingClientRect().height / 2,
  }))

  const dragEnd = await page.$eval('#thought-2', el => ({
    x: el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2,
    y: el.getBoundingClientRect().y + el.getBoundingClientRect().height / 2,
  }))

  // Move the mouse to the drag target, then press, move to the drop target, and release
  await page.mouse.move(dragStart.x, dragStart.y)
  await page.mouse.down()
  await page.mouse.move(dragEnd.x, dragEnd.y) // The steps can be adjusted for smoother dragging
  await page.mouse.up()
}

export default dragAndDrop
