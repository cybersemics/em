
import {
  equalThoughtValue,
} from '../util'

// Determin whether a thought is archived or not
export const isThoughtArchived = path => {
  return path.find(equalThoughtValue('=archive')) || false
}
