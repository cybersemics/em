import Index from '../@types/IndexType'
import keyValueBy from './keyValueBy'

/** Filters an object by a predicate. If the predicate is omitted, filters out falsey values. */
const filterObject = <T>(obj: Index<T>, predicate?: (key: string, value: T) => boolean): Index<T> =>
  keyValueBy(obj, (key, value) => ((predicate ? predicate(key, value) : value) ? { [key]: value } : null))

export default filterObject
