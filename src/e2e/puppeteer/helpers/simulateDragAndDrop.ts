import { page } from '../session'

interface Options {
  /** Renders all DropHover components. */
  drag?: boolean
  /** Renders all drop targets with color blocks. */
  drop?: boolean
}
/** Sets testFlags for simulating drag and drop process. */
const simulateDragAndDrop = async ({ drag, drop }: Options): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100))

  await page.evaluate(
    (drag, drop) => {
      const em = window.em
      em.testFlags.simulateDrag = !!drag
      em.testFlags.simulateDrop = !!drop
    },
    drag,
    drop,
  )
}

export default simulateDragAndDrop
