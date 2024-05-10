import DOMPurify from 'dompurify'
import { HimalayaNode, parse } from 'himalaya'
import { unescape as unescapeHtml } from 'html-escaper'
import _ from 'lodash'
import { ALLOWED_ATTR, ALLOWED_FORMATTING_TAGS } from '../constants'
import formattingNodeToHtml from './formattingNodeToHtml'
import isFormattingTag from './isFormattingTag'

type StripOptions = { preserveFormatting?: boolean; preventTrim?: boolean; stripAttributes?: boolean }

const REGEX_NBSP = /&nbsp;/gim
const REGEX_DECIMAL_SPACE = /&#32;/gim
const REGEX_BR_TAG = /<br.*?>/gim
const REGEX_SPAN_TAG_ONLY_CONTAINS_WHITESPACES = /<span[^>]*>([\s]+)<\/span>/gim
const REGEX_EMPTY_FORMATTING_TAGS = /<[^/>][^>]*>\s*<\/[^>]+>/gim

/** Strip HTML tags, close incomplete html tags, convert nbsp to normal spaces, and trim. */
const strip = (
  html: string,
  { preserveFormatting = false, preventTrim = false, stripAttributes = true }: StripOptions = {},
) => {
  const replacedHtml = html
    .replace(/<\/p><p/g, '</p>\n<p') // <p> is a block element, if there is no newline between <p> tags add newline.
    .replace(REGEX_BR_TAG, '\n') // Some text editors add <br> instead of \n
    .replace(REGEX_SPAN_TAG_ONLY_CONTAINS_WHITESPACES, '$1') // Replace span tags contain whitespaces
    .replace(REGEX_DECIMAL_SPACE, ' ') // Some text editors use decimal code for space character
    .replace(REGEX_EMPTY_FORMATTING_TAGS, '') // Remove empty formatting tags

  const sanitizedHtml = unescapeHtml(
    DOMPurify.sanitize(replacedHtml, {
      ALLOWED_TAGS: preserveFormatting ? ALLOWED_FORMATTING_TAGS : [],
      ALLOWED_ATTR,
    })
      // DOMPurify replaces spaces with &nbsp;, so we need to replace them after sanitizing rather than in the replacedHtml replacements above
      .replace(REGEX_NBSP, ' '),
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

export default strip
