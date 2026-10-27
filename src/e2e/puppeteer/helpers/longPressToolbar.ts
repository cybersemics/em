import { page } from '../session'
import scrollIntoView from './scrollIntoView'
import waitForSelector from './waitForSelector'

/**
 * Press and hold the Undo or Redo toolbar button until the long press opens the Undo Slider, then release. Undo and Redo are the only toolbar buttons with a long press. Holds a touch under mobile emulation and the mouse on desktop. Times out after 5 seconds.
 */
const longPressToolbar = async (label: 'Undo' | 'Redo') => {
  const toolbarSelector = `[data-testid="toolbar-icon"][aria-label="${label}"]`

  // The toolbar scrolls horizontally, so center the button rather than scrolling it just far enough, since the toolbar's edges are overlapped by opaque scroll arrows that would swallow the press.
  const button = await waitForSelector(toolbarSelector)
  await scrollIntoView(toolbarSelector, { block: 'nearest', inline: 'center' })

  const boundingBox = await button?.boundingBox()
  if (!boundingBox) throw new Error(`Bounding box of the ${label} toolbar button not found.`)

  const x = boundingBox.x + boundingBox.width / 2
  const y = boundingBox.y + boundingBox.height / 2
  const isMobile = page.viewport()?.isMobile

  if (isMobile) {
    await page.touchscreen.touchStart(x, y)
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
  }

  await waitForSelector('[data-testid="undo-slider"][data-open="true"]', { visible: true, timeout: 5000 })

  if (isMobile) {
    await page.touchscreen.touchEnd()
  } else {
    await page.mouse.up()
  }
}

export default longPressToolbar
