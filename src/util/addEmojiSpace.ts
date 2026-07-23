import { EMOJI_REGEX } from '../constants'

/*
Regex pattern that matches a group of emojis starting from the beginning of the string.

Note: Some emojis end with zero width joiner or zero width space which don't actually give any visible whitespace.
        So optionally including them at the end of the regex.
*/
const emojiGroupRegex = new RegExp(`^(${EMOJI_REGEX.source}){1,}\u200D?\u200B?`)

/**
 * Returns the visible text and the corresponding insertion index in the source HTML for each character boundary.
 * Formatting tags are ignored so that leading emojis can be detected without rewriting or normalizing the markup.
 */
const getVisibleText = (html: string): { sourceIndices: number[]; text: string } => {
  const sourceIndices = [0]
  let text = ''

  for (let i = 0; i < html.length; ) {
    if (html[i] === '<') {
      const tagEnd = html.indexOf('>', i + 1)
      if (tagEnd >= 0) {
        i = tagEnd + 1
        continue
      }
    }

    text += html[i]
    i++
    sourceIndices[text.length] = i
  }

  return { sourceIndices, text }
}

/* Note: The above regex uses unicode property escape to match emojis https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes.
  However these emoji property escapes don't account for emoji variant selector (\ufe0f) which can be found in many emojis (example: 🖼️, 🖥️).
  So we add \ufe0f as optional match and also prevent it from being detected as non emoji character.
*/

/**
 * If a string starts with an emoji or group of emojis followed by a non-whitespace, non-emoji character,
 * then insert a space between the emoji and the character.
 */
const addEmojiSpace = (html: string): string => {
  const { sourceIndices, text } = getVisibleText(html)
  const match = text.match(emojiGroupRegex)

  if (match && match[0] && match[0].length < text.length) {
    const startsWithNonWhiteSpaceCharacter = /^\S/.test(text.slice(match[0].length))
    const insertionIndex = sourceIndices[match[0].length]
    return startsWithNonWhiteSpaceCharacter
      ? `${html.slice(0, insertionIndex)} ${html.slice(insertionIndex)}`
      : html
  }

  return html
}

export default addEmojiSpace
