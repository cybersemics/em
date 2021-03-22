/**
 * Splits given value by special characters.
 */
export const splitSentence = (value: string) => {
  const mainSplitRegex = /[.!?]+/g
  const hasMainSplitCharacters = mainSplitRegex.test(value)
  // Allow split on comma only if there are no main split characters in the value.
  const seperator = hasMainSplitCharacters ? mainSplitRegex : ','
  return value.split(seperator).filter(s => s !== '').map(s => `${s.trim()}${hasMainSplitCharacters ? '.' : ''}`)
}
