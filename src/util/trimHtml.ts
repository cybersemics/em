/** Trims boundary whitespace, including encoded spaces, while preserving HTML and interior whitespace. */
const trimHtml = (input: string): string => {
  let startTags = ''
  let content = input
  let endTags = ''

  // Trim leading whitespace
  while (content.length > 0) {
    const tagMatch = content.match(/^<[^>]*>/)
    const whitespaceMatch = content.match(/^(?:\s|&nbsp;|&#(?:0*(?:32|160)|x0*(?:20|a0));)+/i)

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
    const whitespaceMatch = content.match(/(?:\s|&nbsp;|&#(?:0*(?:32|160)|x0*(?:20|a0));)+$/i)

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
