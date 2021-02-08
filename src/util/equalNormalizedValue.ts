import { Child } from '../types'
import { normalizeThought } from './normalizeThought'

/** Makes a comparator with the given value to check a Child's normalized value.
 */
export const equalNormalizedValue = (value: string) => (thought: Child) =>
  thought && normalizeThought(thought.value) === normalizeThought(value)
