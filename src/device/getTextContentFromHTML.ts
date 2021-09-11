/**
 * Returns text without any html tags for the given HTML value. It accurately represents how user sees the text in the browser.
 */
const getTextContentFromHTML = (htmlValue: string) => {
  if (typeof document === 'undefined' || !document.createElement) return htmlValue.replace(/(<([^>]+)>)/gi, '')
  const dummyDiv = document.createElement('div')
  dummyDiv.innerHTML = htmlValue

  return dummyDiv.textContent!
}

export default getTextContentFromHTML
