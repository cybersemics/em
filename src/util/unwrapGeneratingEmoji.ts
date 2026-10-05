/**
 * Removes temporary generating-emoji wraps so they cannot be persisted as thought HTML. The wrap is display-only and
 * is applied while an AI request is in flight.
 */
const unwrapGeneratingEmoji = (html: string): string => {
  if (!html.includes('data-generating-emoji')) return html

  const container = document.createElement('div')
  container.innerHTML = html
  ;[...container.querySelectorAll('[data-generating-emoji]')].forEach(span => {
    span.replaceWith(...span.childNodes)
  })

  return container.innerHTML
}

export default unwrapGeneratingEmoji
