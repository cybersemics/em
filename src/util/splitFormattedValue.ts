import mergeAdjacentTags from './mergeAdjacentTags'
import splitHtmlAtTextOffset from './splitHtmlAtTextOffset'
import trimHtml from './trimHtml'

/**
 * Splits a formatted value into the value with the selection removed and the extracted selection, with formatting tags
 * re-balanced onto each part. A formatted value cannot be sliced by the selection offsets, since they are plain text
 * offsets that do not line up with the indices of the markup, causing the slice to land in the middle of a tag (#4103).
 *
 * @param value The source HTML.
 * @param selectionStart The plain text offset of the start of the selection.
 * @param selectionEnd The plain text offset of the end of the selection.
 */
const splitFormattedValue = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { remainingValue: string; extractedValue: string } => {
  // Split at the end offset first so that the left half can then be split at the start offset. The right half of a split cannot be re-split at the end offset, since its text offsets are relative to itself, not to the original value.
  const endSplit = splitHtmlAtTextOffset(value, selectionEnd)
  return {
    // merge the formatting tags that end up adjacent when the two halves are re-joined, e.g. <b>Lorem </b><b>dolor</b>
    remainingValue: trimHtml(
      mergeAdjacentTags(`${splitHtmlAtTextOffset(value, selectionStart).left}${endSplit.right}`),
    ),
    extractedValue: trimHtml(splitHtmlAtTextOffset(endSplit.left, selectionStart).right),
  }
}

export default splitFormattedValue
