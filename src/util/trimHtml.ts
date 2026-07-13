/** Trims leading and trailing whitespace from an HTML string. */
const trimHtml = (input: string): string => {
  let startTags = ''
  let content = input
  let endTags = ''

  // Trim leading whitespace
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

  // Trim trailing whitespace
  while (content.length > 0) {
    const tagMatch = content.match(/<[^>]*>$/)
    const whitespaceMatch = content.match(/\s+$/)

    if (tagMatch) {
      endTags = tagMatch[0] + endTags
      content = content.slice(0, -1 * tagMatch[0].length)
    } else if (whitespaceMatch) {
      content = content.slice(0, -1 * whitespaceMatch[0].length)
    } else {
      break
    }
  }

  return startTags + content + endTags
}

export default trimHtml
