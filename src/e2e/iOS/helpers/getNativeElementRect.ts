import { Browser, Element } from 'webdriverio'

/** Return native element rect. */
const getNativeElementRect = async (browser: Browser<'async'>, selector: string) => {
  const oldContext = ((await browser.getContext()) as string) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const element = (await browser.$(selector)) as Element<'async'>
  const elementRect = await browser.getElementRect(element.elementId)
  await browser.switchContext(oldContext)
  return elementRect
}

export default getNativeElementRect
