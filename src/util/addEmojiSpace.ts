import { EMOJI_REGEX } from '../constants'

/*
Regex pattern that matches a group of emojis starting from the beginning of the string.

Note: Some emojis end with zero width joiner or zero width space which don't actually give any visible whitespace.
        So optionally including them at the end of the regex.
*/
const emojiGroupRegex = new RegExp(`^(${EMOJI_REGEX.source}){1,}\u200D?\u200B?`)

/* Note: The above regex uses unicode property escape to match emojis https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes.
  However these emoji property escapes don't account for emoji variant selector (\ufe0f) which can be found in many emojis (example: 🖼️, 🖥️).
  So we add \ufe0f as optional match and also prevent it from being detected as non emoji character.
*/

/**
 * If a string starts with an emoji or group of emojis followed by a non-whitespace, non-emoji character,
 * then insert a space between the emoji and the character.
 */
const addEmojiSpace = (text: string): string => {
  const match = text.match(emojiGroupRegex)

  if (match && match[0] && match[0].length < text.length) {
    const replaceRegex = new RegExp(`^\\${match[0]}`)
    const afterEmojis = text.replace(replaceRegex, '')
    const startsWithNonWhiteSpaceCharacter = /^[^\s]/.test(afterEmojis)
    return startsWithNonWhiteSpaceCharacter ? text.replace(replaceRegex, `${match[0]} `) : text
  }

  return text
}

export default addEmojiSpace
