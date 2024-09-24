import { Page } from 'puppeteer'
import remove from './remove'

/** Removes the heads-up-display (header, footer, menu, navbar, and toolbar) so that only the thoughts are shown. */
const removeHUD = async (page: Page) => {
  await remove(page, '[aria-label="footer"]')
  await remove(page, '[aria-label="menu"]')
  await remove(page, '[aria-label="nav"]')
  await remove(page, '[aria-label="toolbar"]')
}

export default removeHUD
