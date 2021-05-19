const regexAllTags = /<(?:.|\n)*?>/gmi
const regexPreserveFormattingTags = /<(?!\/?(b|i|u|em|strong)(?: (?:.|\n)*)?>)(?:.|\n)*?>/gmi
const regexTagAndAttributes = /<(?![/])(?:(\w*)((?:.|\n)*?))\/?>/gmi
const regexNbsp = /&nbsp;/gmi
const regexDecimalSpace = /&#32;/gmi
const regexBrTag = /<br.*?>/gmi

type StripOptions = { preserveFormatting?: boolean, preventTrim?: boolean }

/** Strip HTML tags, convert nbsp to normal spaces, and trim. */
export const strip = (html: string, { preserveFormatting, preventTrim }: StripOptions = { preserveFormatting: false, preventTrim: false }) => {
  const replacedHtml = html
    .replace(/<\/p><p/g, '</p>\n<p') // <p> is a block element, if there is no newline between <p> tags add newline.
    .replace(regexBrTag, '\n') // Some text editors add <br> instead of \n
    .replace(preserveFormatting ? regexPreserveFormattingTags : regexAllTags, '')
    // second pass to replace formatting tag attributes e.g. <b style="...">
    .replace(regexTagAndAttributes, '<$1>')
    .replace(regexNbsp, ' ')
    .replace(regexDecimalSpace, ' ') // Some text editors use decimal code for space character

  return preventTrim
    ? replacedHtml
    : replacedHtml.trim()
}
