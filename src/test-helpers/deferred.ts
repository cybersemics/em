/** Controls an external I/O boundary without replacing provider or Redux behavior. */
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(complete => {
    resolve = complete
  })
  return { promise, resolve }
}

export default deferred
