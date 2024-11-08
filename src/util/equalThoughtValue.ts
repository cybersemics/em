import Thought from '../@types/Thought'

/** Makes a comparator with the given value to check a Child's value.
 *
    Usage
      // finds the thought with value 'test'
      path.map(equalThoughtValue('test')).
 */
const equalThoughtValue = (value: string) => (thought: Thought) => thought && thought.value === value

export default equalThoughtValue
