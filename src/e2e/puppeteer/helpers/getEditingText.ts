import { page } from '../setup'

/**
 * Get the thought value that cursor on.
 */
const getEditingText = () =>
  page.evaluate(() => {
    return document.querySelector('[data-editing=true] [data-editable]')?.innerHTML
  })

export default getEditingText
