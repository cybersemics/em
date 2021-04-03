import { Page } from 'puppeteer'

/**
 * Click the bullet for the given thought.
 */
const clickBullet = async (page: Page, hashedContext: string) => {
  const query = `.context-${hashedContext} > .thought-container .bullet .glyph`
  const bulletNode = await page.evaluateHandle(query => {
    return document.querySelector(query) as HTMLElement
  }, query)
  if (!bulletNode) throw new Error('Bullet node not found.')
  await bulletNode.asElement()?.click()
}

export default clickBullet
