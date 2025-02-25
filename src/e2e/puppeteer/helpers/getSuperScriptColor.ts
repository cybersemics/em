import { page } from '../setup'

/**
 * Get the color of the superscript that cursor is on.
 */
const getSuperScriptColor = () =>
  page.evaluate(() => {
    const SuperScriptColor = document.querySelector("[data-editing=true] [role='superscript']") as HTMLElement
    return SuperScriptColor?.style.color || null
  })

export default getSuperScriptColor
