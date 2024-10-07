import { Element } from 'himalaya'
import _ from 'lodash'
import stripStyleAttribute from './stripStyleAttribute'

/** Replace font to span return a new object with attributes. */
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
  const newNode = replaceFontToSpan(node)
  if (newNode.tagName === 'span') {
    const styleAttributes = _.filter(newNode.attributes, { key: 'style' })

    const strippedStyleAttribute = styleAttributes
      .map(styleAttribute => stripStyleAttribute(styleAttribute.value))
      .filter(strippedAttribute => strippedAttribute.length > 0)
      .join('')

    return strippedStyleAttribute.length > 0
      ? `<${newNode.tagName} style="${strippedStyleAttribute}">${content}</${newNode.tagName}>`
      : content
  }

  return `<${newNode.tagName}>${content}</${newNode.tagName}>`
}

export default formattingNodeToHtml
