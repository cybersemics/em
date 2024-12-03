import KeyframeShape from './KeyframeShape'

/**
 * NestedShape Interface.
 *
 * Represents a nested shape within a shape group, allowing for hierarchical structures.
 */
interface NestedShape {
  ind?: number
  ty: string
  ix?: number
  ks?: KeyframeShape
  nm?: string
  [key: string]: unknown // Permit additional properties
}

export default NestedShape
