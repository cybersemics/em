import type { Element } from 'webdriverio'

/**
 * Leaves em for a blank page that contains only a contenteditable span with the given text, so that a test can tell
 * the browser's own behavior apart from em's. The page copies em's viewport so that zoom and double tap behave the
 * same. Since resetApp only resets em, return to it with browser.back() before the next test.
 */
const openPlainEditable = async (text: string): Promise<Element> => {
  await browser.url('about:blank')
  await browser.execute(text => {
    const viewport = document.createElement('meta')
    viewport.name = 'viewport'
    viewport.content =
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=overlays-content'
    document.head.append(viewport)

    const editable = document.createElement('span')
    editable.contentEditable = 'true'
    editable.textContent = text
    editable.style.fontSize = '18px'
    document.body.style.margin = '60px 20px'
    document.body.append(editable)

    // Measured: listeners added to this static page after the keyboard opened received no touches, so register one up front as em does.
    window.addEventListener('touchstart', () => {}, { passive: true })
  }, text)
  return browser.$('span[contenteditable]').getElement()
}

export default openPlainEditable
