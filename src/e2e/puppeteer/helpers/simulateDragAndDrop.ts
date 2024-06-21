import { Page } from 'puppeteer'
import { WindowEm } from '../../../initialize'

interface Options {
  drag: boolean
  drop: boolean
}
const em = window.em as WindowEm

/** Sets testFlags for simulating drag and drop process . */
const simulateDragAndDrop = async (page: Page, options?: Options): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100))

  const { drag, drop } = options ?? { drag: true, drop: true }

  await page.evaluate(
    (drag, drop) => {
      em.testFlags.simulateDrag = drag ?? true
      em.testFlags.simulateDrop = drop ?? true
    },
    drag,
    drop,
  )
}

export default simulateDragAndDrop
