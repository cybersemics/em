import { Page } from 'puppeteer'

/** Clicks the element returned by a selector. */
const click = (page: Page, selector: string) => page.click(selector)

export default click
