import { REGEX_EMOJI_GLOBAL } from '../constants'
import stripTags from './stripTags'

/** Returns true when a thought is empty or its visible content consists only of emoji and whitespace. */
const isEmptyOrEmojiOnly = (value: string): boolean => {
  const visibleValue = stripTags(value)
  return visibleValue.replace(REGEX_EMOJI_GLOBAL, '').trim() === ''
}

export default isEmptyOrEmojiOnly
