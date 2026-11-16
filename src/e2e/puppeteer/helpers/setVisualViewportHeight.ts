import { page } from '../session'

/** Supplies Safari's keyboard-resized viewport boundary, which headless Chromium cannot display. Page isolation restores the native API after each test. */
const setVisualViewportHeight = (height: number) =>
  page.evaluate(height => {
    Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: height })
    window.visualViewport!.dispatchEvent(new Event('resize'))
  }, height)

export default setVisualViewportHeight
