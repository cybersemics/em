import { AlertText } from '../../../constants'
import { page } from '../session'
import findFavoriteItem from './findFavoriteItem'
import waitForAlert from './waitForAlert'

/**
 * Tap and hold a favorite in the sidebar until the long press activates, then lift the finger without dragging and wait for the release to be processed.
 *
 * Mobile Safari follows the touchend of a press held for under about two seconds with a click on the pressed element. Chrome's touch emulation sends it only when the finger lifts before Chrome's own long press timeout, so it is sent here explicitly, the way Mobile Safari delivers it (#3693).
 */
const longPressFavorite = async (value: string) => {
  const favorite = await findFavoriteItem(value)
  // Press the link itself rather than the center of the favorite, which can fall between the context breadcrumbs and the link.
  const link = await favorite.evaluateHandle(
    favorite =>
      Array.from(favorite?.querySelectorAll('[data-thought-link]') ?? []).find(
        link => !link.closest('[aria-label="context-breadcrumbs"]'),
      ) ?? null,
  )
  const boundingBox = await link.asElement()?.boundingBox()
  if (!boundingBox) throw new Error(`Favorite "${value}" not found.`)

  const x = boundingBox.x + boundingBox.width / 2
  const y = boundingBox.y + boundingBox.height / 2

  await page.touchscreen.touchStart(x, y)
  await waitForAlert(AlertText.ReorderFavorites)
  await page.touchscreen.touchEnd()
  await page.mouse.click(x, y)

  // The app ends the long press on a timer after the release, so wait for the body's data-drag-hold attribute, which mirrors state.longPress, to return to 'false'.
  await page.waitForFunction(() => document.body.getAttribute('data-drag-hold') === 'false', { timeout: 5000 })
}

export default longPressFavorite
