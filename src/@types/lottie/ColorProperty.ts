import AnimationKeyframe from './AnimationKeyframe'
import RGBA from './RGBA'

/**
 * ColorProperty Interface.
 *
 * Defines color properties for shape items, allowing static colors,
 * animated colors, and keyframe animations.
 */
interface ColorProperty {
  a: number
  k: RGBA | RGBA[] | number[] | AnimationKeyframe[]
}

export default ColorProperty
