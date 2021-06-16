import { Browser } from 'webdriverio'

/** Returns a proxy selection object with async getters for selection properties. */
const getSelection = (browser: Browser<'async'>): Promise<Selection | null> =>
  browser.execute(() => window.getSelection())

export default getSelection
