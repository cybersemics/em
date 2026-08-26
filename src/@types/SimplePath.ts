import Brand from './Brand'
import ThoughtId from './ThoughtId'

/** A contiguous Path with no cycles, i.e. one that crosses no context views. Every step is an ordinary ThoughtId, so a SimplePath is assignable to Path but not vice versa. */
type SimplePath = [ThoughtId, ...ThoughtId[]] & Brand<'SimplePath'>

export default SimplePath
