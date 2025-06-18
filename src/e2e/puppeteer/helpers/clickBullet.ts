import { page } from '../setup'
import getEditable from './getEditable'

/**
 * Click the bullet for the given thought.
 */
const clickBullet = async (value: string) => {
  const editableNode = await getEditable(value)

  if (!editableNode) throw new Error('editable node for the given value not found.')

  const bulletNode = await page.evaluateHandle((editableNode: Element) => {
    const thoughtContainer = editableNode.closest('[aria-label="thought-container"]') as HTMLElement

    if (!thoughtContainer) return

    return thoughtContainer.querySelector('[aria-label="bullet"]')
  }, editableNode)

  if (!bulletNode) throw new Error('Bullet node not found.')

  // @ts-expect-error - https://github.com/puppeteer/puppeteer/issues/8852
  await bulletNode.asElement()?.click()
}

export default clickBullet
