import AnimatedColor from './AnimatedColor'
import StaticColor from './StaticColor'

/**
 * ColorProperty Interface.
 *
 * Defines color properties for shape items, allowing static colors,
 * animated colors, and keyframe animations based on the value of `a`.
 */
type ColorProperty = StaticColor | AnimatedColor

export default ColorProperty
