import { page } from '../session'

/** Supplies the browser's keyboard occlusion boundary, which headless Chromium cannot display. Page isolation restores the native API after each test. */
const setVirtualKeyboardHeight = (height: number) =>
  page.evaluate(height => {
    Object.defineProperty(navigator.virtualKeyboard, 'boundingRect', {
      configurable: true,
      value: new DOMRect(0, window.innerHeight - height, window.innerWidth, height),
    })
    navigator.virtualKeyboard.dispatchEvent(new Event('geometrychange'))
  }, height)

export default setVirtualKeyboardHeight
