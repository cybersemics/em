import { page } from '../setup'

/**
 * Get the color of the bullet that cursor is on.
 */
const getBulletColor = () =>
  page.evaluate(() => {
    const bullet = document.querySelector('[data-editing=true] [aria-label="bullet-glyph"]') as HTMLElement
    return bullet?.style.fill || null
  })

export default getBulletColor
