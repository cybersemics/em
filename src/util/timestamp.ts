import { Timestamp } from '../types'

/** Returns a timestamp of the current time. */
export const timestamp = () => new Date().toISOString() as Timestamp
