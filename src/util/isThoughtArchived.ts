// util
import {
  equalThoughtValue,
} from '../util'

/** Determines whether a thought is archived or not. */
export const isThoughtArchived = path =>
  path.find(equalThoughtValue('=archive')) || false
