import toVisibleText from './toVisibleText'

/** Converts a thought value to visible text (see toVisibleText) and truncates it with an ellipsis at a given limit n. Defaults to 16 characters. */
const ellipsize = (html: string | undefined, n: number = 16): string => {
  const chars = Array.from(toVisibleText(html))
  // subtract 2 so that additional '...' is still within the char limit
  return chars.length > n - 2 ? chars.slice(0, n - 2).join('') + '...' : chars.join('')
}

export default ellipsize
