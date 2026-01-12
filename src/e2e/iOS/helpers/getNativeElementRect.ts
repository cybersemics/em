/**
 * Return native element rect.
 * Uses the global browser object from WDIO.
 */
const getNativeElementRect = async (selector: string) => {
  const oldContext = ((await browser.getContext()) as string) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const element = await browser.$(selector).getElement()
  const elementRect = await browser.getElementRect(element.elementId)
  await browser.switchContext(oldContext)
  return elementRect
}

export default getNativeElementRect
