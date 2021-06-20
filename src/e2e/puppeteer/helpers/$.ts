import { Page } from 'puppeteer'

/** Performs a querySelector on the document. */
const $ = (page: Page, selector: string) => page.$(selector)

export default $
