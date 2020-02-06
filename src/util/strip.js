/** Strip HTML tags, convert nbsp to normal spaces, and trim. */
export const strip = (html, stripFormatting = true) => {
  const formatedString = html
    .replace(/<(?:.|\n)*?>/gm, '')
    .replace(/&nbsp;/gm, ' ')
    .trim()
  if (stripFormatting) {
    return formatedString
  }
  else {
    return html
  }
}
