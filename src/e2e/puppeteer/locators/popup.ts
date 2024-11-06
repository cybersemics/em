import { page } from '../setup'

/** Returns the QuickDropPanel element. */
const popup = () => page.locator('[data-testid="popup-value"]').wait()

export default popup
