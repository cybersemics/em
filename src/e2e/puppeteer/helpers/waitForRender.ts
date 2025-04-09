import { page } from '../setup'

/** Waits one animation frame for the next render. */
// Note: requestAnimationFrame may be irrelevant due to page.evaluate latency.
const waitForRender = () => page.evaluate(() => new Promise(window.requestAnimationFrame))

export default waitForRender
