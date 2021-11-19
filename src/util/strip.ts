import _ from 'lodash'
import { unescape } from 'html-escaper'
import sanitize from 'sanitize-html'
import { parse, HimalayaNode } from 'himalaya'
import { ALLOWED_ATTRIBUTES, ALLOWED_FORMATTING_TAGS } from '../constants'
import { formattingNodeToHtml, isFormattingTag } from '../util'

const regexNbsp = /&nbsp;/gim
const regexDecimalSpace = /&#32;/gim
const regexBrTag = /<br.*?>/gim
type StripOptions = { preserveFormatting?: boolean; preventTrim?: boolean; stripAttributes?: boolean }

const regexSpanTagOnlyContainsWhitespaces = /<span[^>]*>([\s]+)<\/span>/gim

/** Strip HTML tags, close incomplete html tags, convert nbsp to normal spaces, and trim. */
export const strip = (
  html: string,
  { preserveFormatting, preventTrim, stripAttributes }: StripOptions = {
    preserveFormatting: false,
    preventTrim: false,
    stripAttributes: true,
  },
) => {
  const replacedHtml = html
    .replace(/<\/p><p/g, '</p>\n<p') // <p> is a block element, if there is no newline between <p> tags add newline.
    .replace(regexBrTag, '\n') // Some text editors add <br> instead of \n
    .replace(regexSpanTagOnlyContainsWhitespaces, '$1') // Replace span tags contain whitespaces
    .replace(regexNbsp, ' ')
    .replace(regexDecimalSpace, ' ') // Some text editors use decimal code for space character

  const sanitizedHtml = unescape(
    sanitize(replacedHtml, {
      allowedTags: preserveFormatting ? ALLOWED_FORMATTING_TAGS : [],
      allowedAttributes: ALLOWED_ATTRIBUTES,
    }),
  )

  let finalHtml = sanitizedHtml

  // if enabled, remove style attributes
  // by default, strip does not remove style attributes since it requires HTML parsing
  if (stripAttributes) {
    const nodes = parse(sanitizedHtml)

    if (nodes.some(isFormattingTag)) {
      const tagsToMerge = _.takeWhile(nodes, node => isFormattingTag(node) || node.type === 'text')
      finalHtml = tagsToMerge.reduce((accum: string, current: HimalayaNode) => {
        const appendContent =
          current.type === 'text' ? current.content : current.type === 'comment' ? '' : formattingNodeToHtml(current)
        return accum + appendContent
      }, '')
    }
  }

  return preventTrim ? finalHtml : finalHtml.trim()
}
