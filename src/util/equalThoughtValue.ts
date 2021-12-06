import { Parent } from '../@types'

/** Makes a comparator with the given value to check a Child's value.
 *
    Usage
      // finds the thought with value 'test'
      path.map(equalThoughtValue('test')).
 */
export const equalThoughtValue = (value: string) => (thought: Parent) => thought && thought.value === value
