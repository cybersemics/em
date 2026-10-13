import LetterCaseType from '../@types/LetterCaseType'
import State from '../@types/State'
import applyLetterCase from '../util/applyLetterCase'
import head from '../util/head'
import getThoughtById from './getThoughtById'
import selectedPaths from './selectedPaths'

/** Returns the letter case shared by the thoughts a letter-case action edits, or an empty string for no common case. */
const getSelectedLetterCase = (state: State): LetterCaseType | '' => {
  const paths = selectedPaths(state)
  if (!paths.length) return ''

  const texts = paths.map(path => {
    const value = getThoughtById(state, head(path))?.value || ''
    // Classify visible text without letting color or other formatting attributes influence its case.
    return new DOMParser().parseFromString(value, 'text/html').body.textContent ?? ''
  })
  const types: LetterCaseType[] = ['LowerCase', 'UpperCase', 'SentenceCase', 'TitleCase']
  return types.find(type => texts.every(text => text === applyLetterCase(type, text))) ?? ''
}

export default getSelectedLetterCase
