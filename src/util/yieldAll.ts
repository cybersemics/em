/** Providers a thin wrapper function to yield all items in series. */
async function* yieldAll<T>(its: AsyncIterable<T>[]): AsyncIterable<T> {
  // eslint-disable-next-line fp/no-loops
  for (const it of its) yield* it
}

export default yieldAll
