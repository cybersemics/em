import { titleCase } from 'title-case'
import LetterCaseType from '../@types/LetterCaseType'

/**
 * Applies a transformation to the text segments of an HTML string, leaving the markup (tags and attributes) untouched.
 * Uppercasing the whole value would corrupt tags such as <font color="..."> into <FONT COLOR="...">, breaking
 * case-sensitive color detection (e.g. getThoughtFill) and turning the bullet the default color (#4265).
 */
const transformText = (value: string, transform: (text: string) => string): string =>
  value
    .split(/(<[^>]+>)/)
    .map(segment => (segment.startsWith('<') && segment.endsWith('>') ? segment : transform(segment)))
    .join('')

/** Util function to apply the appropriate transformation based on the command. */
const applyLetterCase = (command: LetterCaseType, value: string): string => {
  switch (command) {
    case 'LowerCase':
      return transformText(value, text => text.toLowerCase())
    case 'UpperCase':
      return transformText(value, text => text.toUpperCase())
    case 'SentenceCase': {
      const lower = value.toLowerCase()
      // Capitalize the first word character after each period, skipping any HTML tags in between.
      const afterPeriod = lower.replace(
        /(\.\s*(?:<[^>]+>\s*)*)(\w)/g,
        (match, prefix, char) => prefix + char.toUpperCase(),
      )
      // Capitalize the first word character of the string, skipping any leading whitespace or HTML tags.
      return afterPeriod.replace(/^(\s*(?:<[^>]+>\s*)*)(\w)/, (match, prefix, char) => prefix + char.toUpperCase())
    }
    case 'TitleCase':
      return titleCase(value.toLowerCase())
    default:
      return value
  }
}

export default applyLetterCase
