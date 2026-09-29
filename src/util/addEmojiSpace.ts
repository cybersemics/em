import { REGEX_EMOJI_GROUP } from '../constants'

/**
 * Returns the visible text and the corresponding insertion index in the source HTML for each character boundary.
 * Formatting tags are ignored so that leading emojis can be detected without rewriting or normalizing the markup.
 */
const getVisibleText = (html: string): { sourceIndices: number[]; text: string } => {
  const sourceIndices = [0]
  let text = ''

  for (let i = 0; i < html.length;) {
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

/**
 * If a string starts with an emoji or group of emojis followed by a non-whitespace, non-emoji character,
 * then insert a space between the emoji and the character.
 */
const addEmojiSpace = (html: string): string => {
  const { sourceIndices, text } = getVisibleText(html)
  const match = text.match(REGEX_EMOJI_GROUP)

  if (match && match[0] && match[0].length < text.length) {
    const startsWithNonWhiteSpaceCharacter = /^\S/.test(text.slice(match[0].length))
    const insertionIndex = sourceIndices[match[0].length]
    return startsWithNonWhiteSpaceCharacter ? `${html.slice(0, insertionIndex)} ${html.slice(insertionIndex)}` : html
  }

  return html
}

export default addEmojiSpace
