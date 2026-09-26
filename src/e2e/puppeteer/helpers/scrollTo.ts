import { page } from '../session'

/** Scrolls the window instantly to the given scrollTop through the production scrollTo, which supersedes any scroll the cursor had queued. */
const scrollTo = async (y: number) => {
  await page.evaluate((y: number) => window.em.testHelpers.scrollTo(y), y)
}

export default scrollTo
