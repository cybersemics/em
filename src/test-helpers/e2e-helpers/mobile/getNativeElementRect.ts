import { Browser } from 'webdriverio'

/** Return native element rect. */
const getNativeElementRect = async (browser: Browser<'async'>, selector: string) => {
  const oldContext = await browser.getContext() || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const element = await browser.$(selector)
  const elementRect = await browser.getElementRect(element.elementId)
  await browser.switchContext(oldContext)
  return elementRect
}

export default getNativeElementRect
