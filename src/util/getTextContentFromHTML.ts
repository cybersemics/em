/**
 * Returns text without any html tags for the given HTML value. It accurately represents how user sees the text in the browser.
 */
export const getTextContentFromHTML = (htmlValue: string) => htmlValue.replace(/(<([^>]+)>)/gi, '')
