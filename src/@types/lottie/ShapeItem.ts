import ColorProperty from './ColorProperty'
import KeyframeShape from './KeyframeShape'
import NestedShape from './NestedShape'

/**
 * ShapeItem Interface.
 *
 * Represents a single shape item in a Lottie animation, which can have colors, nested shapes,
 * keyframe animations, and additional properties.
 */
interface ShapeItem {
  ty: string
  c?: ColorProperty
  it?: ShapeItem[] | NestedShape[] // Allow additional shape structures
  ks?: KeyframeShape // Optional keyframe data
  nm?: string
  [key: string]: unknown // Permit extra properties
}

export default ShapeItem
