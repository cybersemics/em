import isHome from './isHome'

/**
 * Remove home token, de-indent (trim), and append newline.
 */
const removeHome = (exported: string) => {
  const firstLineBreakIndex = exported.indexOf('\n')
  const firstThought = exported.slice(0, firstLineBreakIndex).slice(1).trim()

  return isHome([firstThought])
    ? exported
        .slice(firstLineBreakIndex)
        .split('\n')
        .map(line => line.slice(2))
        .join('\n') + '\n'
    : exported
}

export default removeHome
