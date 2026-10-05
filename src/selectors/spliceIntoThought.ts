import Path from '../@types/Path'
import State from '../@types/State'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import addEmojiSpace from '../util/addEmojiSpace'
import head from '../util/head'
import insertHtmlAtTextOffset from '../util/insertHtmlAtTextOffset'
import mergeAdjacentTags from '../util/mergeAdjacentTags'
import splitHtmlAtTextOffset from '../util/splitHtmlAtTextOffset'
import getThoughtById from './getThoughtById'

/** Splices single-line text into a thought's value at the caret, or over the given range. Returns the untrimmed value and the caret offset after the inserted text, or null if the thought does not exist. */
const spliceIntoThought = (
  state: State,
  {
    caretPosition = 0,
    path,
    rawDestValue,
    replaceEnd,
    replaceStart,
    text,
  }: {
    caretPosition?: number
    path: Path
    rawDestValue?: string
    replaceEnd?: number
    replaceStart?: number
    text: string
  },
): { value: string; offset: number } | null => {
  const destThought = getThoughtById(state, head(path))
  if (!destThought) return null

  const destValue = rawDestValue || destThought.value

  // Both halves of the edit are addressed by plain text offset and resolved through the DOM. Indexing into the markup
  // instead cuts between two tag contexts, leaving a tag unclosed (#5154), and considers an entity to have as many characters
  // as its markup is long (#5297).
  const replacedDestValue = state.cursorCleared
    ? ''
    : replaceStart != null && replaceEnd != null
      ? mergeAdjacentTags(
          `${splitHtmlAtTextOffset(destValue, replaceStart).left}${splitHtmlAtTextOffset(destValue, replaceEnd).right}`,
        )
      : destValue

  const insertOffset = replaceStart ?? caretPosition
  const combinedValue = insertHtmlAtTextOffset(replacedDestValue, insertOffset, text)
  const value = addEmojiSpace(combinedValue)
  // the caret lands after the inserted text, which starts where the replaced range did rather than where it ended
  const offsetBeforeEmojiSpace = insertOffset + getTextContentFromHTML(text).length
  const emojiSpaceInsertionOffset = value === combinedValue ? -1 : getTextContentFromHTML(value).indexOf(' ')
  const offset =
    emojiSpaceInsertionOffset >= 0 && offsetBeforeEmojiSpace >= emojiSpaceInsertionOffset
      ? offsetBeforeEmojiSpace + 1
      : offsetBeforeEmojiSpace

  return { value, offset }
}

export default spliceIntoThought
