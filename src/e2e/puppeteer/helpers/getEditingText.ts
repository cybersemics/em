import { page } from '../session'

/**
 * Get the thought value that cursor on.
 */
const getEditingText = () =>
  page.evaluate(() => {
    return document.querySelector('[data-editing=true] [data-editable]')?.innerHTML
  })

export default getEditingText
