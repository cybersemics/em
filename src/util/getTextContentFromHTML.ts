import { isMobile } from './isMobile'

/**
 * Returns text without any html tags for the given HTML value. It accurately represents how user sees the text in the browser.
 */
export const getTextContentFromHTML = (htmlValue: string) => {
  if (isMobile()) return htmlValue.replace(/(<([^>]+)>)/gi, '')
  const dummyDiv = document.createElement('div')
  dummyDiv.innerHTML = htmlValue

  return dummyDiv.textContent!
}
