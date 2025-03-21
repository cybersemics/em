import { page } from '../setup'

/**
 * Get the color of the superscript that cursor is on.
 */
const getSuperscriptColor = () =>
  page.evaluate(() => {
    const editableElement = document.querySelector("[data-editing=true] [role='superscript']") as HTMLElement
    return editableElement?.style.color || null
  })

export default getSuperscriptColor
