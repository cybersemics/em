import { fetchPage } from './setup'

/**
 * Get the thought value that cursor on.
 */
const getEditingText = () =>
  fetchPage().evaluate(() => {
    return document.querySelector('.editing .editable')?.innerHTML
  })

export default getEditingText
