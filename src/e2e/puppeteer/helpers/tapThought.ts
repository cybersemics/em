import { page } from '../session'
import waitForEditable from './waitForEditable'

/**
 * Taps the thought with the given value with touch input. The value is matched against the editable's innerHTML, so a
 * formatted thought must be given with its markup, e.g. `<b>apple</b>`.
 *
 * Distinct from clickThought, which dispatches a DOM click on the element and thus does not exercise the touch input
 * path that mobile actually takes.
 */
const tapThought = async (value: string) => {
  const editable = await waitForEditable(value)
  const boundingBox = await editable.asElement()?.boundingBox()
  if (!boundingBox) throw new Error(`Bounding box not found for thought "${value}"`)
  // tap the inside left edge so that the tap lands on the thought rather than the empty space after it
  await page.touchscreen.tap(boundingBox.x + 1, boundingBox.y + boundingBox.height / 2)
}

export default tapThought
