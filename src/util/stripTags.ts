/** Parses a single pseudo-tag thought value and returns plain words.
 *
 * This only matches a single opening tag-like token with optional attribute-like words,
 * with an optional matching closing tag and no inner text.
 *
 * Examples include:
 * - "<hello world of people>" => "hello world of people".
 * - "<hello world=\"\" of=\"\"></hello>" => "hello world of".
 * - "<b>test</b>" => null (handled by stripParsedHtml instead).
 */
const parseLiteralAngleBracketText = (value: string) => {
  const trimmed = value.trim()
  const openingTagEnd = trimmed.indexOf('>')

  if (!trimmed.startsWith('<') || !trimmed.endsWith('>') || openingTagEnd < 1) return null

  const openingTagText = trimmed.slice(1, openingTagEnd).trim()
  const openingWords = openingTagText
    .split(/\s+/)
    .map(word => word.split('=')[0])
    .filter(Boolean)

  if (openingWords.length === 0 || openingWords[0].startsWith('/')) return null

  const trailingText = trimmed.slice(openingTagEnd + 1).trim()
  const expectedClosingTag = `</${openingWords[0]}>`

  if (trailingText !== '' && trailingText !== expectedClosingTag) return null

  return openingWords.join(' ')
}

/** Strips html tags by parsing the string as html and returning text content. */
const stripParsedHtml = (value: string) => {
  const template = document.createElement('template')
  template.innerHTML = value
  return template.content.textContent || ''
}

/** Strips HTML-looking tags from the given string. */
const stripTags = (s: string) => {
  const literalAngleBracketText = parseLiteralAngleBracketText(s)
  return literalAngleBracketText || stripParsedHtml(s)
}

export default stripTags
