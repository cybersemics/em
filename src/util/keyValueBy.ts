import Index from '../@types/IndexType'

type Key = string | number | symbol
type Scalar = string | boolean | number | null | undefined
type KeyValueGenerator<K, V, R> = (key: K, value: V, accum: Index<R>) => Index<R> | null

function keyValueBy<T, R>(arr: T[], keyValue: KeyValueGenerator<T, number, R>, initialValue?: Index<R>): Index<R>
function keyValueBy<T extends Key, R extends Scalar>(arr: T[], keyValue: R, initialValue?: Index<R>): Index<R>
function keyValueBy<T, R>(obj: Index<T>, keyValue: KeyValueGenerator<string, T, R>, initialValue?: Index<R>): Index<R>
function keyValueBy<T extends Key, R extends Scalar>(obj: Index<T>, keyValue: R, initialValue?: Index<R>): Index<R>

/** Generates an object from an array or object. Simpler than reduce or _.transform. The KeyValueGenerator passes (key, value) if the input is an object, and (value, i) if it is an array. The return object from each iteration is merged into the accumulated object. Return null to skip an item. */
function keyValueBy<
  /** The type of the input object or array values. */
  T,
  /** The type of the return object values. */
  R,
>(
  input: T[] | Index<T>,
  keyValue: KeyValueGenerator<T, number, R> | KeyValueGenerator<string, T, R> | R,
  accum: Index<R> = {},
): Index<R> {
  const isArray = Array.isArray(input)

  const keyValueFunction =
    typeof keyValue === 'function'
      ? keyValue
      : // convert keyValue scalar to KeyValueGenerator function
        isArray
        ? // we know that value is a valid index key since a scalar was given
          ((value => ({ [value as unknown as string | number | symbol]: keyValue })) as KeyValueGenerator<T, number, R>)
        : (((key, value) => ({ [key]: keyValue })) as KeyValueGenerator<string, T, R>)

  // considerably faster than Array.prototype.reduce
  Object.entries(input || {}).forEach(([key, value], i) => {
    const generatedObject = isArray
      ? (keyValueFunction as KeyValueGenerator<T, number, R>)(value, i, accum)
      : (keyValueFunction as KeyValueGenerator<string, T, R>)(key, value, accum)
    Object.entries(generatedObject || {}).forEach(entry => {
      accum[entry[0]] = entry[1]
    })
  })

  return accum
}

export default keyValueBy
