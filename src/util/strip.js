/** Strip HTML tags, convert nbsp to normal spaces, and trim. */
export const strip = html => html
  .replace(/<(?:.|\n)*?>/gm, '')
  .replace(/&nbsp;/gm, ' ')
  .trim()
