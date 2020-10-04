/** Simple debounce with default leading false. Lodash's debounce breaks jest fake timers in Jest < 26. */
export const debounce = (fn, wait, { leading } = {}) => {
  let timer = null // eslint-disable-line fp/no-let
  let pendingArgs = null // eslint-disable-line fp/no-let

  const cancel = jest.fn(() => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = null
    pendingArgs = null
  })

  const flush = jest.fn(() => {
    if (timer) {
      fn(...pendingArgs)
      cancel()
    }
  })

  // eslint-disable-next-line jsdoc/require-jsdoc
  const wrapped = (...args) => {
    cancel()
    pendingArgs = args
    if (leading) {
      fn(...args)
    }
    timer = setTimeout(flush, wait)
  }

  wrapped.cancel = cancel
  wrapped.flush = flush
  wrapped.wait = wait

  return wrapped
}

/* Calls debounce with { leading: true }. */
/**
 *
 */
export const throttle = (fn, wait, options = {}) =>
  debounce(fn, wait, { leading: true, ...options })
