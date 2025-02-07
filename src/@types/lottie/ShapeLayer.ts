import NestedShape from './NestedShape'
import ShapeItem from './ShapeItem'

/**
 * ShapeLayer Interface.
 *
 * Represents a layer that can contain multiple shapes and other properties for Lottie animations.
 */
interface ShapeLayer {
  ty: number
  shapes?: (ShapeItem | NestedShape)[] // Combine both types for flexibility
  [key: string]: unknown // Allow for any additional properties
}

export default ShapeLayer
