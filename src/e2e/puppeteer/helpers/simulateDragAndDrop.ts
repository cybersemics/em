import { page } from '../session'

interface Options {
  /** Renders all DropHover components. */
  drag?: boolean
  /** Renders all drop targets with color blocks. */
  drop?: boolean
  /** Keeps every drop hover that becomes visible during the current drag mounted, so multiple drop hovers can be compared in a single snapshot. See: https://github.com/cybersemics/em/issues/3115. */
  pinDropHovers?: boolean
}
/** Sets testFlags for simulating drag and drop process. */
const simulateDragAndDrop = async ({ drag, drop, pinDropHovers }: Options): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100))

  await page.evaluate(
    (drag, drop, pinDropHovers) => {
      const em = window.em
      em.testFlags.simulateDrag = !!drag
      em.testFlags.simulateDrop = !!drop
      em.testFlags.pinDropHovers = !!pinDropHovers
    },
    drag,
    drop,
    pinDropHovers,
  )
}

export default simulateDragAndDrop
