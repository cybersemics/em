import { REGEX_EMOJI_PREFIX } from '../constants'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import splitHtmlAtTextOffset from './splitHtmlAtTextOffset'

/** A thought value split into its leading emoji and the text that the emoji labels. */
interface EmojiSplit {
  /** The plain text length of the prefix, i.e. the caret offset that falls between the two halves. 0 when there is no prefix. */
  prefixLength: number
  /** The leading emoji and the whitespace that separates it from the rest of the value, or an empty string. */
  valuePrefix: string
  /** The value less its leading emoji, or the whole value when there is no prefix. */
  valueRest: string
}

/**
 * Splits a thought value into its leading emoji (including the whitespace that separates it from the rest of the value)
 * and the remaining text. A value that does not start with an emoji, or that is nothing but an emoji, is returned whole
 * as valueRest, since there would be no text left to separate the emoji from.
 */
const splitEmojiPrefix = (value: string): EmojiSplit => {
  const plainValue = getTextContentFromHTML(value)
  const prefixLength = plainValue.match(REGEX_EMOJI_PREFIX)?.[0].length ?? 0

  if (prefixLength === 0 || prefixLength === plainValue.length)
    return { prefixLength: 0, valuePrefix: '', valueRest: value }

  // A formatted value cannot be sliced at a plain text offset, since the offset does not line up with the indices of the markup, causing the slice to land in the middle of a tag (#5267). Split it as HTML instead, which re-balances the formatting tags onto both halves. An unformatted value takes the fast path, avoiding the DOM entirely.
  const { left, right } =
    plainValue === value
      ? { left: value.slice(0, prefixLength), right: value.slice(prefixLength) }
      : splitHtmlAtTextOffset(value, prefixLength)

  return { prefixLength, valuePrefix: left, valueRest: right }
}

export default splitEmojiPrefix
