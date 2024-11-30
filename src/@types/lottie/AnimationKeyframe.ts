/**
 * AnimationKeyframe Interface.
 *
 * Defines the structure for keyframes in animations, including optional tangents.
 */
interface AnimationKeyframe {
  /** In tangents. */
  i?: { x: number[]; y: number[] }

  /** Out tangents. */
  o?: { x: number[]; y: number[] }

  /** Time. */
  t: number

  /** Values. */
  s: number[]
}

export default AnimationKeyframe
