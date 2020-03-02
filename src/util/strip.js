/** Strip HTML tags, convert nbsp to normal spaces, and trim. */
export const strip = (html, { preserveFormatting } = {}) => html
  // .replace(/<(?:.|\n)*?>/gm, '')
  .replace(preserveFormatting
    ? /<(?=(?:.|\n))[^bui]*?>/gm
    : /<(?:.|\n)*?>/gm
  , '')
  .replace(/&nbsp;/gm, ' ')
  .trim()
