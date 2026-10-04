import { isCapacitor, isIOS, isTouch } from '../../browser'
import androidCapacitorHandler from './handlers/androidCapacitorHandler'
import androidWebHandler from './handlers/androidWebHandler'
import iOSCapacitorHandler from './handlers/iOSCapacitorHandler'
import iOSSafariHandler from './handlers/iOSSafariHandler'
import simulatedKeyboardHandler from './handlers/simulatedKeyboardHandler'

/** True on the dev server outside Puppeteer, where desktop Chrome's device emulation needs a simulated keyboard (see simulatedKeyboardHandler). Puppeteer also runs the dev server with mobile emulation, and is excluded so its tests see no keyboard. */
const simulateKeyboard = import.meta.env.MODE === 'development' && !navigator.webdriver

/** A controller for managing the virtual keyboard handlers based on the platform. */
const virtualKeyboardHandler = {
  /** Initializes the appropriate virtual keyboard handler based on the platform. */
  init: () => {
    if (isCapacitor() && isIOS) {
      iOSCapacitorHandler.init()
    } else if (isCapacitor() && !isIOS) {
      androidCapacitorHandler.init()
    } else if (isTouch && 'virtualKeyboard' in navigator) {
      // Android mobile web (Chromium): the keyboard overlays content and does not fire a visualViewport
      // resize, so use the VirtualKeyboard API to detect the keyboard closing. iOS Safari lacks this API
      // and falls through to iOSSafariHandler.
      androidWebHandler.init()
      if (simulateKeyboard) simulatedKeyboardHandler.init()
    } else {
      // fallback
      iOSSafariHandler.init()
    }
  },
  /** Destroys the appropriate virtual keyboard handler based on the platform. */
  destroy: () => {
    if (isCapacitor() && isIOS) {
      iOSCapacitorHandler.destroy()
    } else if (isCapacitor() && !isIOS) {
      androidCapacitorHandler.destroy()
    } else if (isTouch && 'virtualKeyboard' in navigator) {
      androidWebHandler.destroy()
      if (simulateKeyboard) simulatedKeyboardHandler.destroy()
    } else {
      // fallback
      iOSSafariHandler.destroy()
    }
  },
  /**
   * Opens the virtual keyboard for the given editable on platforms that do not open it automatically when
   * the browser selection is set.
   *
   * Must be called BEFORE `selection.set`. Setting the selection focuses the editing host implicitly, and a
   * focus that the browser did not attribute to a script (or a tap) does not raise the keyboard — nor does a
   * subsequent `focus()`, which is a no-op once the element is already focused.
   */
  show: (editable: HTMLElement) => {
    if (isCapacitor() && isIOS) {
      iOSCapacitorHandler.show?.(editable)
    } else if (isCapacitor() && !isIOS) {
      androidCapacitorHandler.show?.(editable)
    } else if (isTouch && 'virtualKeyboard' in navigator) {
      androidWebHandler.show?.(editable)
    } else {
      // fallback
      iOSSafariHandler.show?.(editable)
    }
  },
}

export default virtualKeyboardHandler
