import { isRoot } from './isRoot'

/**
 * Remove root, de-indent (trim), and append newline.
 */
export const removeRoot = (exported: string) => {
  const firstLineBreakIndex = exported.indexOf('\n')
  const firstThought = exported.slice(0, firstLineBreakIndex).slice(1).trim()

  return isRoot([firstThought])
    ? exported
      .slice(firstLineBreakIndex + 1)
      .split('\n')
      .map(line => line.slice(2))
      .join('\n')
    : exported
}
