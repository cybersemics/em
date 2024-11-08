import { page } from '../setup'

/** Returns the QuickDropPanel element. */
const quickDropPanel = () => page.locator('[data-testid="quick-drop-panel"]').wait()

export default quickDropPanel
