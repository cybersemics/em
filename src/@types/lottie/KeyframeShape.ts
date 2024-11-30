/**
 * KeyframeShape Interface.
 *
 * Defines keyframe data for shapes, including in/out tangents and values.
 */
interface KeyframeShape {
  a: number
  k: {
    i: number[][]
    o: number[][]
    v: number[][]
    c: boolean
  }
}

export default KeyframeShape
