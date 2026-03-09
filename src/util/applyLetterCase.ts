import { titleCase } from 'title-case'
import LetterCaseType from '../@types/LetterCaseType'

/** Util function to apply the appropriate transformation based on the command. */
const applyLetterCase = (command: LetterCaseType, value: string): string => {
  switch (command) {
    case 'LowerCase':
      return value.toLowerCase()
    case 'UpperCase':
      return value.toUpperCase()
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
