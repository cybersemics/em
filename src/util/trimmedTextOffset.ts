/**
 * Converts an offset in text as the browser holds it into one in the same text trimmed, which is how a note's value is
 * saved while its draft keeps what was typed: less the leading whitespace that the trim removes, and no further than
 * the end of the trimmed text.
 */
const trimmedTextOffset = (offset: number, text: string): number =>
  Math.min(Math.max(0, offset - (text.length - text.trimStart().length)), text.trim().length)

export default trimmedTextOffset
