import { isCapacitor, isIOS } from '../../browser'
import iOSCapacitorHandler from './handlers/iOSCapacitorHandler'
import iOSSafariHandler from './handlers/iOSSafariHandler'

/** A controller for managing the virtual keyboard handlers based on the platform. */
const virtualKeyboardHandler = {
  /** Initializes the appropriate virtual keyboard handler based on the platform. */
  init: () => {
    if (isCapacitor() && isIOS) {
      iOSCapacitorHandler.init()
    } else {
      // fallback
      iOSSafariHandler.init()
    }
  },
  /** Destroys the appropriate virtual keyboard handler based on the platform. */
  destroy: () => {
    if (isCapacitor() && isIOS) {
      iOSCapacitorHandler.destroy()
    } else {
      // fallback
      iOSSafariHandler.destroy()
    }
  },
}

export default virtualKeyboardHandler
