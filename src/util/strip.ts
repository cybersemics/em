import DOMPurify from 'dompurify'
import { Element, HimalayaNode, Text, parse } from 'himalaya'
import _ from 'lodash'
import { ALLOWED_ATTR, ALLOWED_FORMATTING_TAGS, EXTERNAL_FORMATTING_TAGS } from '../constants'
import formattingNodeToHtml from './formattingNodeToHtml'
import isFormattingTag from './isFormattingTag'

type StripOptions = {
  preserveFormatting?: boolean
  preventTrim?: boolean
  stripAttributes?: boolean
  stripColors?: boolean
  convertToOutline?: boolean
}

const REGEX_NBSP = /&nbsp;/gim
const REGEX_DECIMAL_SPACE = /&#32;/gim
const REGEX_BR_TAG = /<br.*?>/gim
const REGEX_SPAN_TAG_ONLY_CONTAINS_WHITESPACES = /<span[^>]*>([\s]+)<\/span>/gim
const REGEX_EMPTY_FORMATTING_TAGS = /<[^/>][^>]*>\s*<\/[^>]+>/gim

/** Handle workflowy HTML format. */
export const handleWorkflowy = (nodes: HimalayaNode[], depth = 0): string => {
  let result = ''
  const indent = '   '.repeat(depth)

  for (const node of nodes) {
    if (node.type === 'text') {
      const text = (node as Text).content.trim()
      if (text) {
        result += `${indent}- ${text}\n`
      }
    } else if (node.type === 'element') {
      const element = node as Element

      // Handle root level name span
      if (
        element.tagName === 'span' &&
        element.attributes?.find((attr: { key: string }) => attr.key === 'class')?.value === 'name'
      ) {
        const innerContent = element.children.find(
          child =>
            child.type === 'element' &&
            (child as Element).attributes?.find((attr: { key: string }) => attr.key === 'class')?.value ===
              'innerContentContainer',
        )
        if (innerContent?.type === 'element') {
          result += handleWorkflowy(innerContent.children, depth)
        }
      }
      // Handle name divs
      else if (
        element.tagName === 'div' &&
        element.attributes?.find((attr: { key: string }) => attr.key === 'class')?.value === 'name'
      ) {
        const innerContent = element.children.find(
          child =>
            child.type === 'element' &&
            (child as Element).attributes?.find((attr: { key: string }) => attr.key === 'class')?.value ===
              'innerContentContainer',
        )
        if (innerContent?.type === 'element') {
          result += handleWorkflowy(innerContent.children, depth)
        }
      }
      // Handle note spans
      else if (
        element.tagName === 'span' &&
        element.attributes?.find((attr: { key: string }) => attr.key === 'class')?.value === 'note'
      ) {
        const innerContent = element.children.find(
          child =>
            child.type === 'element' &&
            (child as Element).attributes?.find((attr: { key: string }) => attr.key === 'class')?.value ===
              'innerContentContainer',
        )
        if (innerContent?.type === 'element') {
          result += `${indent}- =note\n`
          result += handleWorkflowy(innerContent.children, depth + 1)
        }
      }
      // Handle lists
      else if (element.tagName === 'ul') {
        if (element.children.length > 0) {
          result += handleWorkflowy(element.children, depth + 1)
        }
      }
      // Handle list items
      else if (element.tagName === 'li') {
        let currentDepth = depth
        for (const child of element.children) {
          if (child.type === 'element') {
            const childElement = child as Element
            // Process name div
            if (
              childElement.tagName === 'div' &&
              childElement.attributes?.find((attr: { key: string }) => attr.key === 'class')?.value === 'name'
            ) {
              result += handleWorkflowy([child], currentDepth)
              currentDepth += 1 // Increase depth for subsequent elements
            }
            // Process note span
            else if (
              childElement.tagName === 'span' &&
              childElement.attributes?.find((attr: { key: string }) => attr.key === 'class')?.value === 'note'
            ) {
              result += handleWorkflowy([child], currentDepth)
            }
            // Process nested lists
            else if (childElement.tagName === 'ul') {
              result += handleWorkflowy(childElement.children, currentDepth)
            }
          }
        }
      }
      // Handle other elements with children
      else if (element.children.length > 0 && element.tagName !== 'span') {
        result += handleWorkflowy(element.children, depth)
      }
    }
  }

  return result
}

/** Strip HTML tags, close incomplete html tags, convert nbsp to normal spaces, and trim.
 * PrserveFormatting is used to preserve the html formatting.
 * StripColors is used to strip only colors of the html.
 * StripAttributes is used to remove style attributes.
 * ConvertToOutline is used to convert HTML to an outline format.
 */
const strip = (
  html: string,
  { preserveFormatting = false, preventTrim = false, stripAttributes = true, stripColors = false }: StripOptions = {},
) => {
  const replacedHtml = html
    .replace(/<\/p><p/g, '</p>\n<p') // <p> is a block element, if there is no newline between <p> tags add newline.
    .replace(REGEX_BR_TAG, '\n') // Some text editors add <br> instead of \n
    .replace(REGEX_SPAN_TAG_ONLY_CONTAINS_WHITESPACES, '$1') // Replace span tags contain whitespaces
    .replace(REGEX_DECIMAL_SPACE, ' ') // Some text editors use decimal code for space character
    .replace(REGEX_EMPTY_FORMATTING_TAGS, '') // Remove empty formatting tags

  const sanitizedHtml = DOMPurify.sanitize(replacedHtml, {
    ALLOWED_TAGS: stripColors ? EXTERNAL_FORMATTING_TAGS : preserveFormatting ? ALLOWED_FORMATTING_TAGS : [],
    ALLOWED_ATTR,
  })
    // DOMPurify replaces spaces with &nbsp;, so we need to replace them after sanitizing rather than in the replacedHtml replacements above
    .replace(REGEX_NBSP, ' ')

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
