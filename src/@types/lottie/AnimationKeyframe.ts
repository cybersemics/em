/**
 * AnimationKeyframe Interface.
 *
 * Defines the structure for keyframes in animations, including optional tangents.
 */
interface AnimationKeyframe {
  i?: { x: number[]; y: number[] } // In tangents
  o?: { x: number[]; y: number[] } // Out tangents
  t: number // Time
  s: number[] // Values
}

export default AnimationKeyframe
