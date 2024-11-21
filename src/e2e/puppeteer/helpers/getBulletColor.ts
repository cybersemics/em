import { page } from '../setup'

/**
 * Get the thought value that cursor on.
 */
const getBulletColor = () =>
  page.evaluate(() => {
    const bullet = document.querySelector('[data-editing=true] [aria-label="bullet-glyph"]') as HTMLElement
    return bullet?.style.fill || null
  })

export default getBulletColor
