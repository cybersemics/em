export type RGBA = [number, number, number, number]

/** The structure of ColorProperty for a shape item. */
export interface ColorProperty {
  a: number
  k: RGBA | RGBA[] | number[] | AnimationKeyframe[]
}

interface AnimationKeyframe {
  i?: { x: number[]; y: number[] } // In tangents
  o?: { x: number[]; y: number[] } // Out tangents
  t: number // Time
  s: number[] // Values
}

/** A shape item structure for Lottie animations. */
export interface ShapeItem {
  ty: string
  c?: ColorProperty
  it?: ShapeItem[] | NestedShape[] // Allow additional shape structures
  ks?: KeyframeShape // Optional keyframe data
  nm?: string
  [key: string]: unknown // Permit extra properties
}

export interface NestedShape {
  ind?: number
  ty: string
  ix?: number
  ks?: KeyframeShape
  nm?: string
  [key: string]: unknown
}

export interface KeyframeShape {
  a: number
  k: {
    i: number[][]
    o: number[][]
    v: number[][]
    c: boolean
  }
}

/** A layer that could contain multiple shapes and other properties as per JSON example. */
export interface ShapeLayer {
  shapes?: (ShapeItem | NestedShape)[] // Combine both types for flexibility
  [key: string]: unknown // Allow for any additional properties
}

/** The main Lottie data interface consisting of multiple layers. */
interface LottieData {
  layers: ShapeLayer[] // Main layers array, which may contain various types
}

export default LottieData
