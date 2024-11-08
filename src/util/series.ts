/**
 * Serially executes an array of promise-returning functions and returns an array of results.
 *
 * @param fs    An array of funcs that return promises.
 * @example
 *   const urls = ['/url1', '/url2', '/url3']
 *   await series(urls.map(url => () => $.ajax(url)))
 */
const series = <T>(fs: ((() => Promise<T> | null) | null)[]): Promise<T[]> =>
  fs.reduce(
    (accum, f) =>
      accum.then(result => {
        if (!f) return result
        const p = f()
        return p ? p.then(x => [...result, x]) : result
      }),
    Promise.resolve([] as T[]),
  )

export default series
