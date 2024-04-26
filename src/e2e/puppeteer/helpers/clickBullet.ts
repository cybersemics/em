import { Page } from 'puppeteer'
import getEditable from './getEditable'

/**
 * Click the bullet for the given thought.
 */
const clickBullet = async (page: Page, value: string) => {
  const editableNode = await getEditable(page, value)

  if (!editableNode) throw new Error('editable node for the given value not found.')

  const bulletNode = await page.evaluateHandle((editableNode: Element) => {
    const thoughtContainer = editableNode.closest('.thought-container') as HTMLElement | null

    if (!thoughtContainer) return null

    return thoughtContainer.querySelector(':scope > .bullet')
  }, editableNode)

  if (!bulletNode) throw new Error('Bullet node not found.')

  // TODO
  await (bulletNode as any).asElement()?.click()
}

export default clickBullet
