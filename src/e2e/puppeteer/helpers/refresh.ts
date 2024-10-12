import { fetchPage } from './setup'

/** Refreshes the page. */
const refresh = () => fetchPage().evaluate(() => window.location.reload())

export default refresh
