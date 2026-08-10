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
      // the last node ends at transform(text).length, i.e. the end of the transformed text, so nothing is ever dropped
      const transformedEnd = transform(text.slice(0, end)).length
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

/** Util function to apply the appropriate transformation based on the command. */
const applyLetterCase = (command: LetterCaseType, value: string): string => {
  switch (command) {
    case 'LowerCase':
      return transformText(value, text => text.toLowerCase())
    case 'UpperCase':
      return transformText(value, text => text.toUpperCase())
    case 'SentenceCase':
      return transformText(value, toSentenceCase)
    case 'TitleCase':
      return transformText(value, text => titleCase(text.toLowerCase()))
    default:
      return value
  }
}

export default applyLetterCase
