/** Strip HTML tags, convert nbsp to normal spaces, and trim. */
export const strip = (html, stripFormatting = true) => {
  return stripFormatting
    ?
      html
        .replace(/<(?:.|\n)*?>/gm, '')
        .replace(/&nbsp;/gm, ' ')
        .trim()
    :
      html
      .replace(/<(?:.|\n)*?([^bui])>/gm, '')
      .replace(/&nbsp;/gm, ' ')
      .trim()
}
