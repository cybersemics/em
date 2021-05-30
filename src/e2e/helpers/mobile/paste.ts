import { Browser } from 'webdriverio'

/** Import text on given unranked path using exposed testHelpers. */
const paste = async (browser: Browser<'async'>, unrankedPath: string[], text: string) => {

  // Note: This helper is exposed because copy paste seemed impossible in headless mode. With headless false copy paste with ctrl + v seems to work. ??
  await browser.execute((unrankedPath, text) => {
    const testHelpers = (window.em as any).testHelpers
    testHelpers.importTextFirstMatch(unrankedPath, text)
  }, unrankedPath, text)
}

export default paste
