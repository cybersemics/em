import Brand from './Brand'
import Path from './Path'

/** A contiguous Path with no cycles. */
type SimplePath = Path & Brand<'SimplePath'>

export default SimplePath
