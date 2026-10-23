import { ElementHandle, JSHandle } from 'puppeteer'
import { page } from '../session'

/**
 * Touch and hold a word in a thought the way Chrome for Android does, leaving the finger down so that the test can move
 * or lift it, and return the position of the finger. The touch is real, and the helper waits for the bullet of the pressed thought to be highlighted,
 * indicating that em's long press has activated.
 *
 * Chrome for Android then answers the held touch with its own long press gesture: Blink selects the word under the
 * finger and then dispatches a touch contextmenu event (GestureManager::HandleGestureLongPress). Headless Chrome
 * generates no long press gesture from a CDP touch, so the helper simulates that response in the page.
 */
const longPressWord = async (nodeHandle: ElementHandle<Element> | JSHandle<undefined>, word: string) => {
  const editable = nodeHandle.asElement()
  if (!editable) throw new Error('Node handle does not contain a valid Element')

  const wordRect = await editable.evaluate((el, word) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node && !node.textContent?.includes(word)) node = walker.nextNode()
    if (!node) throw new Error(`Word "${word}" not found in the thought`)
    const range = document.createRange()
    range.setStart(node, node.textContent!.indexOf(word))
    range.setEnd(node, node.textContent!.indexOf(word) + word.length)
    const { x, y, width, height } = range.getBoundingClientRect()
    return { x, y, width, height }
  }, word)

  const coordinate = { x: wordRect.x + wordRect.width / 2, y: wordRect.y + wordRect.height / 2 }

  const bulletElement = await editable.evaluateHandle(el => {
    const bullet = (el as Element).closest('[aria-label="thought-container"]')?.querySelector('[aria-label="bullet"]')
    if (!bullet) throw new Error('Bullet not found in thought container')
    return bullet
  })

  await page.touchscreen.touchStart(coordinate.x, coordinate.y)
  await page.waitForFunction(
    (bullet: Element) => bullet.getAttribute('data-highlighted') === 'true',
    { timeout: 5000 },
    bulletElement,
  )

  await editable.evaluate(
    (el, word, { x, y }) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()
      while (node && !node.textContent?.includes(word)) node = walker.nextNode()
      if (!node) throw new Error(`Word "${word}" not found in the thought`)
      const range = document.createRange()
      range.setStart(node, node.textContent!.indexOf(word))
      range.setEnd(node, node.textContent!.indexOf(word) + word.length)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      if (selection.toString() !== word) throw new Error(`Failed to select "${word}"`)

      const target = document.elementFromPoint(x, y)
      if (!target) throw new Error('No element under the long press')
      target.dispatchEvent(
        new PointerEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
        }),
      )
    },
    word,
    coordinate,
  )

  return coordinate
}

export default longPressWord
