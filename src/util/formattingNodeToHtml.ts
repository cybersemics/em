import { Element } from 'himalaya'
import _ from 'lodash'
import stripStyleAttribute from './stripStyleAttribute'

/** Strip span and encode a <i> or <b> element as HTML. */
const replaceFontToSpan = (node: Element) => {
  if (node.tagName === 'font') {
    const newAttributes = node.attributes.map(attr => {
      return attr.key === 'style'
        ? { key: attr.key, value: attr.value }
        : {
            key: 'style',
            value: `${attr.key}: ${attr.value}`,
          }
    })

    // Return a new object that represents the updated node
    return {
      ...node,
      tagName: 'span',
      attributes: newAttributes,
    }
  }
  return node
}

/** Converts a formatting node to HTML. */
const formattingNodeToHtml = (node: Element) => {
  const content: string = node.children.reduce((acc, child) => {
    return acc + (child.type === 'text' ? child.content : child.type === 'comment' ? '' : formattingNodeToHtml(child))
  }, '')
  node = replaceFontToSpan(node)
  if (node.tagName === 'span') {
    const styleAttributes = _.filter(node.attributes, { key: 'style' })

    const strippedStyleAttribute = styleAttributes
      .map(styleAttribute => stripStyleAttribute(styleAttribute.value))
      .filter(strippedAttribute => strippedAttribute.length > 0)
      .join('')

    return strippedStyleAttribute.length > 0
      ? `<${node.tagName} style="${strippedStyleAttribute}">${content}</${node.tagName}>`
      : content
  }

  return `<${node.tagName}>${content}</${node.tagName}>`
}

export default formattingNodeToHtml
