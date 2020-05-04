
import {
  equalThoughtValue,
} from '../util'

export const isThoughtArchived = path => {
  return path.find(equalThoughtValue('=archive')) || false
}
