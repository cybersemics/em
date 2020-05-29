const regexAllTags = /<(?:.|\n)*?>/gmi
const regexPreserveFormattingTags = /<(?!\/?[biu](?: (?:.|\n)*)?>)(?:.|\n)*?>/gmi
const regexTagAndAttributes = /<(?![/])(?:(\w*)((?:.|\n)*?))\/?>/gmi
const regexNbsp = /&nbsp;/gmi

type StripOptions = {preserveFormatting: boolean, preventTrim: boolean}
/** Strip HTML tags, convert nbsp to normal spaces, and trim. */
export const strip = (html: string, { preserveFormatting, preventTrim }: StripOptions = { preserveFormatting: false, preventTrim: false}) => {
  const replacedHtml = html
    .replace(preserveFormatting ? regexPreserveFormattingTags : regexAllTags, '')
    // second pass to replace formatting tag attributes e.g. <b style="...">
    .replace(regexTagAndAttributes, '<$1>')
    .replace(regexNbsp, ' ')
  return preventTrim
    ? replacedHtml
    : replacedHtml.trim()
}
