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
      const sentenceCaseRegex = /(^\w|\.\s*\w)/gi
      return value.toLowerCase().replace(sentenceCaseRegex, match => match.toUpperCase())
    }
    case 'TitleCase':
      return titleCase(value.toLowerCase())
    default:
      return value
  }
}

export default applyLetterCase
