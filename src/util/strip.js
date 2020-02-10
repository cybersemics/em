/** Strip HTML tags, convert nbsp to normal spaces, and trim. */
// export const strip = html => html
//   .replace(/<(?:.|\n)*?>/gm, '')
//   .replace(/&nbsp;/gm, ' ')
//   .trim()

export const strip = (html, stripFormatting = true) => {
  if (stripFormatting) {
    return html
    .replace(/<(?:.|\n)*?>/gm, '')
    .replace(/&nbsp;/gm, ' ')
    .trim()
  }
  else {
    return html
  }
}
