import { Page } from 'puppeteer'
import { WindowEm } from '../../../initialize'

const em = window.em as WindowEm

/** Sets testFlags for simulating drag and drop process . */
const simulateDragAndDrop = async (page: Page, drag?: boolean, drop?: boolean): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100))

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
