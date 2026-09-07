import { page } from '../session'
import waitForSelector from './waitForSelector'

/**
 * Taps the empty space to the left of the bullets, i.e. inside the content area but outside of any thought. Throws if the point is not empty, so that the tap cannot silently land on a thought.
 */
const tapEmptySpace = async () => {
  await waitForSelector('#content')

  const { x, y } = await page.evaluate(() => {
    const editable = document.querySelector('[data-editable]')
    if (!editable) throw new Error('No thought found to tap beside.')

    // the left margin of the content area, vertically aligned with the first thought
    const rect = editable.getBoundingClientRect()
    const point = { x: 8, y: Math.round(rect.top + rect.height / 2) }

    const el = document.elementFromPoint(point.x, point.y)
    if (!el?.closest('#content') || el.closest('[data-editable]') || el.closest('[aria-label="bullet"]')) {
      throw new Error(`(${point.x}, ${point.y}) is not empty space: ${el?.tagName}#${el?.id}`)
    }

    return point
  })

  await page.touchscreen.tap(x, y)
}

export default tapEmptySpace
