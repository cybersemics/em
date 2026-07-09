/**
 * Trims leading and trailing whitespace from an HTML string.
 * Whitespace that appears strictly before the first opening HTML tag or strictly after the last
 * closing HTML tag is stripped (browser-generated artifacts). Whitespace inside tags and
 * trailing whitespace in plain text (no tags) is preserved so that user-typed spaces survive
 * formatting operations and undo cycles.
 */
const trimHtml = (input: string): string => {
  let startTags = ''
  let content = input
  let endTags = ''

  // Trim leading whitespace (only outside all tags — before the first opening tag)
  while (content.length > 0) {
    const tagMatch = content.match(/^<[^>]*>/)
    const whitespaceMatch = content.match(/^\s+/)

    if (tagMatch) {
      startTags += tagMatch[0]
      content = content.slice(tagMatch[0].length)
    } else if (whitespaceMatch) {
      content = content.slice(whitespaceMatch[0].length)
    } else {
      break
    }
  }

  // True if the original input contains any HTML tag. Used to decide whether to strip trailing
  // whitespace: artifact spaces after closing tags (hasHtmlTags=true, foundClosingTag=false)
  // should be stripped, but user-typed spaces inside tags or in plain text should be preserved.
  const hasHtmlTags = /<[^>]+>/.test(input)
  let foundClosingTag = false

  // Trim trailing whitespace (only outside all tags — after the last closing tag)
  while (content.length > 0) {
    const tagMatch = content.match(/<[^>]*>$/)
    const whitespaceMatch = content.match(/\s+$/)

    if (tagMatch) {
      foundClosingTag = true
      endTags = tagMatch[0] + endTags
      content = content.slice(0, -1 * tagMatch[0].length)
    } else if (whitespaceMatch && !foundClosingTag && hasHtmlTags) {
      // Only strip trailing whitespace that comes after all closing tags (artifact spaces).
      // Once a closing tag has been seen, the remaining whitespace is inside the tag content
      // and should be preserved. Plain-text values (no HTML tags) are never stripped.
      content = content.slice(0, -1 * whitespaceMatch[0].length)
    } else {
      break
    }
  }

  return startTags + content + endTags
}

export default trimHtml
