import { Index } from '../types'

type KeyValueGenerator<K, V, R> = (key: K, value: V, accum: Index<R>) => Index<R> | null

export function keyValueBy<T, R>(arr: T[], keyValue: KeyValueGenerator<T, number, R>, initialValue?: Index<R>): Index<R>
export function keyValueBy<T, R>(obj: Index<T>, keyValue: KeyValueGenerator<string, T, R>, initialValue?: Index<R>): Index<R>

/** Generates an object from an array or object. Simpler than reduce or _.transform. */
export function keyValueBy<T, R>(input: T[] | Index<T>, keyValue: KeyValueGenerator<T | string, number | T, R>, initialValue: Index<R> = {}): Index<R> {

  const arr: (T | string)[] = Array.isArray(input)
    ? input
    : Object.keys(input)

  return arr.reduce((accum: Index<R>, item: T | string, i: number) => {
    const key = Array.isArray(input) ? item : item
    const value = Array.isArray(input) ? i : input[item as string]
    return {
      ...accum,
      ...keyValue(key, value, accum),
    }
  }, initialValue)

}
