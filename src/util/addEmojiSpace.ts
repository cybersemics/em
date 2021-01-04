import { EMOJI_REGEX_STRING } from '../constants'

// regex pattern that checks if string starts with number of emoji followed by non-whitespace, non emoji character
const emojiWithoutSpaceRegex = new RegExp(`^${EMOJI_REGEX_STRING}{1,}(?!(\\s|${EMOJI_REGEX_STRING}|$))`, '')

/**
 * If a string starts with an emoji followed by a non-whitespace, non-emoji character,
 * then insert a space between the emoji and the character.
 */
export const addEmojiSpace = (text: string): string => {
  const match = text.match(emojiWithoutSpaceRegex)
  return match ? match[0] + ' ' + text.substring(match[0].length) : text
}
