import { Index } from '../types'

type KeyValueGenerator<T, V> = (item: T, i: number, accum: Index<V>, arr: T[]) => Index<V> | null

/** Generates an object from an array. Simpler than reduce or _.transform. */
export const keyValueBy = <T, V>(arr: T[], keyValue: KeyValueGenerator<T, V>, initialValue: Index<V> = {}) =>
  arr.reduce((accum, item, i) => ({
    ...accum,
    ...keyValue(item, i, accum, arr),
  }), initialValue)
