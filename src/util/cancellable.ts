/** A weak cancellable promise. The cancel function must be added to an existing promise and then cast to a Cancellable Promise. Promise chains created with then are not cancellable. */
export interface CancellablePromise<T> extends Promise<T> {
  cancel: () => void
}

/** Attaches a cancel function to a promise. It is up to the caller to abort any async functionality that the promise has started. */
const cancellable = <T>(p: Promise<T>, cancel: () => void) => {
  const promise = p as CancellablePromise<T>
  promise.cancel = cancel
  return promise
}

export default cancellable
