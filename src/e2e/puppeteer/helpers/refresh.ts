import { page } from '../session'

/** Refreshes the page. */
const refresh = () => page.evaluate(() => window.location.reload())

export default refresh
