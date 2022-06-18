import { Element, HimalayaNode } from 'himalaya'
import { ALLOWED_FORMATTING_TAGS } from '../constants'

/** Retrieve attribute from Element node by key. */
const getAttribute = (key: string, node: Element) => {
  const { attributes } = node
  if (!attributes) return
  return attributes.find(attr => attr.key === key)?.value
}

/** Check whether node is formatting tag element (<i>...</i>, <b>...</b> or <span>...</span>). */
const isFormattingTag = (node: HimalayaNode) =>
  node.type === 'element' &&
  (node.tagName === 'span' ? getAttribute('class', node) !== 'note' : ALLOWED_FORMATTING_TAGS.includes(node.tagName))

export default isFormattingTag
