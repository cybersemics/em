// util
import {
  equalThoughtValue,
} from '../util'

/* Determine whether a thought is archived or not. */
export const isThoughtArchived = path =>
  path.find(equalThoughtValue('=archive')) || false
