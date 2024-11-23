import AnimationKeyframe from './AnimationKeyframe'
import RGBA from './RGBA'

/**
 * ColorProperty Interface.
 *
 * Defines color properties for shape items, allowing static colors,
 * animated colors, and keyframe animations based on the value of `a`.
 */
type ColorProperty =
  | {
      a: 0 // Static color
      k: RGBA
    }
  | {
      a: 1 // Animated color
      k: AnimationKeyframe[]
    }

export default ColorProperty
