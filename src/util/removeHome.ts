import { HOME_DISPLAY_VALUE } from '../constants'
import isHome from './isHome'

/** Remove the Home wrapper from exports; for a bare root export, keep a readable placeholder instead of HOME_TOKEN. */
const removeHome = (exported: string) => {
  const firstLineBreakIndex = exported.indexOf('\n')
  const hasChildren = firstLineBreakIndex !== -1
  const firstLine = hasChildren ? exported.slice(0, firstLineBreakIndex) : exported
  const hasBullet = firstLine.startsWith('- ')
  const firstThought = (hasBullet ? firstLine.slice(2) : firstLine).trim()

  return isHome([firstThought])
    ? hasChildren
      ? exported
          .slice(firstLineBreakIndex)
          .split('\n')
          .map(line => line.slice(2))
          .join('\n') + '\n'
      : hasBullet
        ? `- ${HOME_DISPLAY_VALUE}`
        : HOME_DISPLAY_VALUE
    : exported
}

export default removeHome
