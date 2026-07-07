import { isCapacitor, isIOS, isTouch } from '../../browser'
import androidCapacitorHandler from './handlers/androidCapacitorHandler'
import androidWebHandler from './handlers/androidWebHandler'
import iOSCapacitorHandler from './handlers/iOSCapacitorHandler'
import iOSSafariHandler from './handlers/iOSSafariHandler'

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
    } else {
      // fallback
      iOSSafariHandler.destroy()
    }
  },
}

export default virtualKeyboardHandler
