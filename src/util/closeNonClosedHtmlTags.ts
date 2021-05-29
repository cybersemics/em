import truncate from 'truncate-html'

/** Close non closed html tags. */
const closeNonClosedHtmlTags = (html :string) => {
  return truncate(html, html.length)
}

export default closeNonClosedHtmlTags
