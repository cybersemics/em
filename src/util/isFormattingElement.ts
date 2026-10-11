import { ALLOWED_FORMATTING_TAGS } from '../constants'

/** Returns true if the node is a formatting element (b/i/u/font/span/etc.). */
const isFormattingElement = (node: Node | null | undefined): node is HTMLElement =>
  !!node &&
  node.nodeType === Node.ELEMENT_NODE &&
  ALLOWED_FORMATTING_TAGS.includes((node as HTMLElement).tagName.toLowerCase())

export default isFormattingElement
