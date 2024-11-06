import { page } from '../setup'

/** Returns the popup element. */
const popup = () => page.locator('[data-testid="popup-value"]').wait()

export default popup
