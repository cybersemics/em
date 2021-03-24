import { once } from './once'

/**
 * Splits given value by special characters.
 */
export const splitSentence = (value: string) => {
  const mainSplitRegex = /[.;!?]+/g

  /** Checks if the value has no other main split characters except one period at the end. */
  const hasOnlyPeriodAtEnd = once(() => /^[^.;!?]*\.$[^.;!?]*/.test(value.trim()))

  const hasMainSplitCharacters = mainSplitRegex.test(value)
  // Allow split on comma only if there are no main split characters in the value or has only one period at the end.
  const seperator = hasMainSplitCharacters && !hasOnlyPeriodAtEnd() ? mainSplitRegex : ','
  return value.split(seperator).filter(s => s !== '').map(s => `${s.trim()}${hasMainSplitCharacters && !hasOnlyPeriodAtEnd() ? '.' : ''}`)
}
