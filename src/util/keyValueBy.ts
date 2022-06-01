import { Index } from '../@types'

type KeyValueGenerator<K, V, R> = (key: K, value: V, accum: Index<R>) => Index<R> | null

export function keyValueBy<T, R>(arr: T[], keyValue: KeyValueGenerator<T, number, R>, initialValue?: Index<R>): Index<R>
export function keyValueBy<T, R>(
  obj: Index<T>,
  keyValue: KeyValueGenerator<string, T, R>,
  initialValue?: Index<R>,
): Index<R>

/** Generates an object from an array or object. Simpler than reduce or _.transform. The KeyValueGenerator passes (key, value) if the input is an object, and (value, i) if it is an array. The return object from each iteration is merged into the accumulated object. Return null to skip an item. */
export function keyValueBy<T, R>(
  input: T[] | Index<T>,
  keyValue: KeyValueGenerator<T | string, number | T, R>,
  initialValue: Index<R> = {},
): Index<R> {
  const isArray = Array.isArray(input)
  const arr = isArray ? input : Object.keys(input)

  /** A reducer than converts an array into an object through a keyValue function. */
  const arrayReducer = (accum: Index<R>, item: T | string, i: number) => ({
    ...accum,
    ...keyValue(item, i, accum),
  })

  /** A reducer that maps an object through a keyValue function. */
  const objectReducer = (accum: Index<R>, item: string, i: number) => ({
    ...accum,
    ...keyValue(item, (input as Index<T>)[item], accum),
  })

  return isArray
    ? (arr as T[]).reduce(arrayReducer, initialValue)
    : (arr as string[]).reduce(objectReducer, initialValue)
}
