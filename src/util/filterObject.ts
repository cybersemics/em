import keyValueBy from './keyValueBy'
import Index from '../@types/IndexType'

/** Filters an object by a predicate. */
const filterObject = <T>(obj: Index<T>, predicate: (key: string, value: T) => boolean) =>
  keyValueBy(obj, (key, value) => (predicate(key, value) ? { [key]: value } : null))

export default filterObject
