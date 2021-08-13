import { isMobile } from './isMobile'

/**
 * Returns text without any html tags for the given HTML value. It accurately represents how user sees the text in the browser.
 */
export const getTextContentFromHTML = (htmlValue: string) => {
  // temporary hack as shim createElement is causing to exceeded maximum calls
  if (isMobile()) return ''

  const dummyDiv = document.createElement('div')
  dummyDiv.innerHTML = htmlValue

  return dummyDiv.textContent!
}
