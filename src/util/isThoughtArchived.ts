// util
import {
  equalThoughtValue,
} from '../util'
import { Path } from '../types'

/** Determines whether a thought is archived or not. */
export const isThoughtArchived = (path: Path) =>
  path.some(equalThoughtValue('=archive')) || false
