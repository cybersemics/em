import { Page } from 'puppeteer'
import { WindowEm } from '../../../initialize'

interface Options {
  /** Renders all DropHover components. */
  drag?: boolean
  /** Renders all drop targets with color blocks. */
  drop?: boolean
}
const em = window.em as WindowEm

/** Sets testFlags for simulating drag and drop process. */
const simulateDragAndDrop = async (page: Page, { drag, drop }: Options): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100))

  await page.evaluate(
    (drag, drop) => {
      em.testFlags.simulateDrag = !!drag
      em.testFlags.simulateDrop = !!drop
    },
    drag,
    drop,
  )
}

export default simulateDragAndDrop
