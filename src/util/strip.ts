import { unescape } from 'html-escaper'
import sanitize from 'sanitize-html'
import { ALLOWED_ATTRIBUTES, ALLOWED_FORMATTING_TAGS } from '../constants'

const regexNbsp = /&nbsp;/gmi
const regexDecimalSpace = /&#32;/gmi
const regexBrTag = /<br.*?>/gmi
type StripOptions = { preserveFormatting?: boolean, preventTrim?: boolean }

const regexSpanTagOnlyContainsWhitespaces = /<span[^>]*>([\s]+)<\/span>/gmi

/** Strip HTML tags, close incomplete html tags, convert nbsp to normal spaces, and trim. */
export const strip = (html: string, { preserveFormatting, preventTrim }: StripOptions = { preserveFormatting: false, preventTrim: false }) => {
  const replacedHtml = html
    .replace(/<\/p><p/g, '</p>\n<p') // <p> is a block element, if there is no newline between <p> tags add newline.
    .replace(regexBrTag, '\n') // Some text editors add <br> instead of \n
    .replace(regexSpanTagOnlyContainsWhitespaces, '$1') // Replace span tags contain whitespaces
    .replace(regexNbsp, ' ')
    .replace(regexDecimalSpace, ' ') // Some text editors use decimal code for space character

  const sanitizedHtml = unescape(sanitize(replacedHtml, {
    allowedTags: preserveFormatting ? ALLOWED_FORMATTING_TAGS : [],
    allowedAttributes: ALLOWED_ATTRIBUTES,
  }))

  return preventTrim
    ? sanitizedHtml
    : sanitizedHtml.trim()
}
