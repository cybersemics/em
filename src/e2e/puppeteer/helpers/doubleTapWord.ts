import { ElementHandle, JSHandle } from 'puppeteer'
import { page } from '../session'

/** The pause between the two taps. Chrome for Android treats two taps as a double tap only when the second begins at
 * least 40ms after the first ends (DOUBLE_TAP_MIN_TIME) and within its double tap timeout, so the pause sits between
 * the two, close to a finger's. */
const TAP_INTERVAL = 80

/**
 * Double tap the middle of a word in a thought, and wait for the browser to finish handling the double tap, which it
 * marks by dispatching the second tap's click with a detail of 2.
 */
const doubleTapWord = async (nodeHandle: ElementHandle<Element> | JSHandle<undefined>, word: string) => {
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

  const x = wordRect.x + wordRect.width / 2
  const y = wordRect.y + wordRect.height / 2

  // Listen for the double tap's click before the first tap, so that it cannot be missed. The promise is wrapped in an
  // object because evaluateHandle would otherwise wait for it to settle before returning.
  const doubleClicked = await page.evaluateHandle(() => ({
    done: new Promise<void>(resolve => {
      /** Resolves on the click of the second tap. */
      const onClick = (e: MouseEvent) => {
        if (e.detail < 2) return
        document.removeEventListener('click', onClick, true)
        resolve()
      }
      document.addEventListener('click', onClick, true)
    }),
  }))

  await page.touchscreen.tap(x, y)
  await new Promise(resolve => setTimeout(resolve, TAP_INTERVAL))
  await page.touchscreen.tap(x, y)

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      doubleClicked.evaluate(listener => listener.done),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`The browser did not register a double tap on "${word}".`)), 5000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export default doubleTapWord
