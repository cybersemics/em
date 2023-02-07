import Brand from './Brand'

/** A timestamp from Date.now() or Date.getTime(). */
type Timestamp = number & Brand<'timestamp'>

export default Timestamp
