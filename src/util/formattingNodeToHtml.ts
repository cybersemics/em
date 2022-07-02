import { Element } from 'himalaya'
import _ from 'lodash'
import stripStyleAttribute from './stripStyleAttribute'

/** Strip span and encode a <i> or <b> element as HTML. */
const formattingNodeToHtml = (node: Element) => {
  const content: string = node.children.reduce((acc, child) => {
    return acc + (child.type === 'text' ? child.content : child.type === 'comment' ? '' : formattingNodeToHtml(child))
  }, '')

  if (node.tagName === 'span') {
    const styleAttribute = _.find(node.attributes, { key: 'style' })
    if (!styleAttribute) {
      return content
    }
    const strippedStyleAttribute = stripStyleAttribute(styleAttribute.value)
    return strippedStyleAttribute.length > 0
      ? `<${node.tagName} style="${strippedStyleAttribute}">${content}</${node.tagName}>`
      : content
  }

  return `<${node.tagName}>${content}</${node.tagName}>`
}

export default formattingNodeToHtml
