import { ElementHandle } from 'puppeteer'
import { isMac } from '../../../browser'
import { page } from '../session'
import getEditable from './getEditable'

interface Options {
  /** Hold the multiselect modifier key (Cmd on Mac, Ctrl otherwise) for the duration of the press. */
  multiselect?: boolean
}

/**
 * Click and hold the bullet of the given thought with the mouse until a long press occurs, then release.
 */
const clickAndHoldBullet = async (value: string, { multiselect = false }: Options = {}) => {
  const editableNode = await getEditable(value)

  const bulletElement = await page.evaluateHandle((editableNode: Element) => {
    if (!editableNode) throw new Error('Editable node for the given value not found.')

    const thoughtContainer = editableNode.closest('[aria-label="thought-container"]')
    if (!thoughtContainer) throw new Error('Thought container not found.')

    const bullet = thoughtContainer.querySelector('[aria-label="bullet"]')
    if (!bullet) throw new Error('Bullet not found in thought container.')

    return bullet
  }, editableNode)

  if (!(bulletElement instanceof ElementHandle)) throw new Error('Bullet element not found.')

  const boundingBox = await bulletElement.boundingBox()
  if (!boundingBox) throw new Error('Bounding box of bullet not found.')

  const modifierKey = isMac ? 'Meta' : 'Control'

  try {
    if (multiselect) await page.keyboard.down(modifierKey)

    await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2)
    await page.mouse.down()

    // wait for this specific bullet to be highlighted, which indicates that the long press has begun
    await page.waitForFunction(
      (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
      { timeout: 5000 },
      bulletElement,
    )

    await page.mouse.up()
  } finally {
    if (multiselect) await page.keyboard.up(modifierKey)
  }
}

export default clickAndHoldBullet
