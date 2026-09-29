import { titleCase } from 'title-case'
import LetterCaseType from '../@types/LetterCaseType'

/**
 * Applies a transformation to the visible text of an HTML string, leaving the markup (tags and attributes) untouched.
 * The value is parsed with DOMParser so that arbitrarily nested markup is handled correctly (a regex cannot).
 * Transforming the whole value would corrupt tags such as <font color="..."> into <FONT COLOR="...">, breaking
 * case-sensitive color detection (e.g. getThoughtFill) and turning the bullet the default color (#4265).
 * The transform is applied to the concatenated text content (so sentence and word boundaries that span multiple
 * text nodes are respected) and the result is redistributed back into the original text nodes.
 * A transform may change the length of the text (e.g. 'ß'.toUpperCase() === 'SS'), so each node's share of the
 * transformed text ends where the transform of the text up to that node ends, rather than at the node's original
 * length, which would truncate the tail.
 */
const transformText = (value: string, transform: (text: string) => string): string => {
  const doc = new DOMParser().parseFromString(value, 'text/html')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const textNodes: Node[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    textNodes.push(node)
  }
  const text = textNodes.map(node => node.textContent ?? '').join('')
  const transformed = transform(text)
  textNodes.reduce(
    (offsets, node) => {
      const end = offsets.end + (node.textContent ?? '').length
      // Clamped so that the boundary can move neither backwards, which would duplicate text, nor past the end of the
      // transformed text. The transform of a prefix can be longer than the transform of the whole text, e.g. title case
      // does not capitalize a token that contains a period, so appending a character can shorten the result.
      // The last node ends at transform(text).length, i.e. the end of the transformed text, so nothing is ever dropped.
      const transformedEnd = Math.min(
        Math.max(transform(text.slice(0, end)).length, offsets.transformedEnd),
        transformed.length,
      )
      node.textContent = transformed.slice(offsets.transformedEnd, transformedEnd)
      return { end, transformedEnd }
    },
    { end: 0, transformedEnd: 0 },
  )
  return doc.body.innerHTML
}

/** Capitalizes the first word character of each sentence, lowercasing the rest. */
const toSentenceCase = (text: string): string => {
  const lower = text.toLowerCase()
  // Capitalize the first word character after each period.
  const afterPeriod = lower.replace(/(\.\s*)(\w)/g, (match, prefix, char) => prefix + char.toUpperCase())
  // Capitalize the first word character of the string, skipping any leading whitespace.
  return afterPeriod.replace(/^(\s*)(\w)/, (match, prefix, char) => prefix + char.toUpperCase())
}

/** Returns the text transform for a letter case command, or null if the command is not a letter case. */
const transformForCommand = (command: LetterCaseType): ((text: string) => string) | null => {
  switch (command) {
    case 'LowerCase':
      return text => text.toLowerCase()
    case 'UpperCase':
      return text => text.toUpperCase()
    case 'SentenceCase':
      return toSentenceCase
    case 'TitleCase':
      return text => titleCase(text.toLowerCase())
    default:
      return null
  }
}

/** Options for {@link applyLetterCase}. */
interface LetterCaseOptions {
  /** Plain-text start offset of the range (inclusive). Defaults to 0, i.e. the start of the value. */
  start?: number
  /** Plain-text end offset of the range (exclusive). Defaults to the end of the value. */
  end?: number
}

/**
 * Applies the appropriate transformation to a value over a plain-text [start, end) range, returning the new HTML.
 * The start and end offsets default to the full range, as in slice.
 */
const applyLetterCase = (
  command: LetterCaseType,
  value: string,
  { start = 0, end = Infinity }: LetterCaseOptions = {},
): string => {
  const transform = transformForCommand(command)
  if (!transform) return value
  // Letter-case only the [start, end) range so that the rest of the thought is left alone (#4281). Windowing the
  // transform rather than the value keeps transformText's markup preservation and its prefix-based redistribution of
  // the transformed text across text nodes, which still holds since the window of a prefix is a prefix of the window.
  return transformText(value, text => text.slice(0, start) + transform(text.slice(start, end)) + text.slice(end))
}

export default applyLetterCase
