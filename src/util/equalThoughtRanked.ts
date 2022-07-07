import PropertyRequired from '../@types/PropertyRequired'
import Thought from '../@types/Thought'

/** Compares two thought objects using { value, rank } as identity and ignoring other properties. */
const equalThoughtRanked = (
  a: PropertyRequired<Thought, 'value' | 'rank'>,
  b: PropertyRequired<Thought, 'value' | 'rank'>,
): boolean => a === b || (a && b && a.value === b.value && a.rank === b.rank)

export default equalThoughtRanked
