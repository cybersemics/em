import { isCapacitor, isIOS } from '../../browser'
import iOSCapacitorHandler from './handlers/iOSCapacitorHandler'
import iOSSafariHandler from './handlers/iOSSafariHandler'

/** Initializes the appropriate virtual keyboard handler based on the platform. */
const initVirtualKeyboard = () => {
  if (isCapacitor() && isIOS) {
    iOSCapacitorHandler.init()
  } else {
    // fallback
    iOSSafariHandler.init()
  }
}

/** Destroys the appropriate virtual keyboard handler based on the platform. */
const destroyVirtualKeyboard = () => {
  if (isCapacitor() && isIOS) {
    iOSCapacitorHandler.destroy()
  } else {
    // fallback
    iOSSafariHandler.destroy()
  }
}

export { initVirtualKeyboard, destroyVirtualKeyboard }
