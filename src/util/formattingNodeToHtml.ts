import { Element } from 'himalaya'
import _ from 'lodash'
import stripStyleAttribute from './stripStyleAttribute'

/** Strip span and encode a <i> or <b> element as HTML. */
const replaceFontToSpan = (node: Element) => {
  if (node.tagName === 'font') {
    node.tagName = 'span'
    node.attributes = node.attributes.map(attr => {
      return attr.key === 'style'
        ? { key: attr.key, value: attr.value }
        : {
            key: 'style',
            value: `${attr.key}: ${attr.value}`,
          }
    })
  }
  return node
}

/** Converts a formatting node to HTML. */
const formattingNodeToHtml = (node: Element) => {
  const content: string = node.children.reduce((acc, child) => {
    return acc + (child.type === 'text' ? child.content : child.type === 'comment' ? '' : formattingNodeToHtml(child))
  }, '')
  replaceFontToSpan(node)
  if (node.tagName === 'span') {
    const styleAttributes = _.filter(node.attributes, { key: 'style' })
    if (!styleAttributes) {
      return content
    }
    let strippedStyleAttribute = ''
    styleAttributes.forEach(styleAttribute => {
      const strippedAttribute = stripStyleAttribute(styleAttribute.value)
      if (strippedAttribute.length > 0) strippedStyleAttribute += strippedAttribute
    })

    return strippedStyleAttribute.length > 0
      ? `<${node.tagName} style="${strippedStyleAttribute}">${content}</${node.tagName}>`
      : content
  }

  return `<${node.tagName}>${content}</${node.tagName}>`
}

export default formattingNodeToHtml
