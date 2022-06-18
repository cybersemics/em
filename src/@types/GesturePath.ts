import Direction from './Direction'

// allow string explicitly since Typescript will not allow Direction[] to be specified as a string
type GesturePath = string | Direction[]

export default GesturePath
