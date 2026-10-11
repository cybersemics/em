import { page } from '../session'

/**
 * Waits until the given number of drop hover bars are shown. The drop hover appears when the browser's asynchronous dragover reaches react-dnd and React commits the new hover state, which can land after the mouse move that caused it resolves. With testFlags.pinDropHovers, every drop hover shown during the drag stays mounted, so the count grows by one with each new drop target hovered. Times out after 6 seconds.
 */
const waitForDropHovers = async (count: number) => {
  try {
    await page.waitForFunction(
      // .drop-hover is the class that dropHoverRecipe gives every drop hover bar
      (count: number) => document.querySelectorAll('.drop-hover').length === count,
      { timeout: 6000 },
      count,
    )
  } catch (e) {
    const rendered = await page.evaluate(() => document.querySelectorAll('.drop-hover').length)
    throw new Error(`Expected ${count} drop hovers to be shown, but ${rendered} were rendered.`, { cause: e })
  }
}

export default waitForDropHovers
