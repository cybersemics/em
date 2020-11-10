/** Yields all items in an iterable so that I don't have to use a for loop. */
export async function* yieldAll<T>(its: AsyncIterable<T>[]): AsyncIterable<T> {
  // eslint-disable-next-line fp/no-loops
  for (const it of its) yield* it
}
