/** Providers a thin wrapper function to yield all items in series. */
async function* yieldAll<T>(its: AsyncIterable<T>[]): AsyncIterable<T> {
  for (const it of its) yield* it
}

export default yieldAll
