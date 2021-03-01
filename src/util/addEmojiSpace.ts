// regex pattern that checks if string starts with number of emoji followed by non-whitespace, non emoji character
const emojiWithoutSpaceRegex = /^((\p{Emoji_Presentation}|\p{Extended_Pictographic})\ufe0f?){1,}(?!(\s|\ufe0f|\p{Emoji_Presentation}|\p{Extended_Pictographic})|$)/gu

/* Note: The above regex uses unicode property escape to match emojis https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes.
  However these emoji property escapes don't account for emoji variant selector (\ufe0f) which can be found in many emojis (example: 🖼️, 🖥️).
  So we add \ufe0f as optional match and also prevent it from being detected as non emoji character.
*/

/**
 * If a string starts with an emoji followed by a non-whitespace, non-emoji character,
 * then insert a space between the emoji and the character.
 */
export const addEmojiSpace = (text: string): string => {
  const match = text.match(emojiWithoutSpaceRegex)
  return match ? match[0] + ' ' + text.substring(match[0].length) : text
}
