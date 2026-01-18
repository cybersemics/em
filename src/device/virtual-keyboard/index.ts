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

export default initVirtualKeyboard
