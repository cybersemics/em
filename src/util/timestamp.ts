import Timestamp from '../@types/Timestamp'

/** Returns a timestamp of the current time. */
const timestamp = () => new Date().toISOString() as Timestamp

export default timestamp
