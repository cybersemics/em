import _ from 'lodash'
import { useEffect, useMemo, useRef } from 'react'

/**
 * A function that schedules an invocation at a later time (e.g., requestAnimationFrame).
 */
export type Scheduler = (invoke: () => void) => void

/**
 * Returns a stable debounced function that always calls the latest callback.
 *
 * - Stable identity across renders (recreated only if wait or opts object changes).
 * - Avoids stale closures by reading the latest callback from a ref.
 * - Optional scheduler to wrap invocation (e.g., requestAnimationFrame).
 */
/* eslint-disable jsdoc/require-jsdoc, jsdoc/require-description-complete-sentence */
export default function useDebouncedLatest<T extends (...args: unknown[]) => void>(
  /** Callback to debounce. The latest version will be invoked. */
  fn: T,
  /** Debounce wait time in milliseconds. */
  wait: number,
  /** lodash.debounce settings plus an optional scheduler wrapper. */
  opts?: _.DebounceSettings & { scheduler?: Scheduler },
) {
  const latestRef = useRef(fn)
  useEffect(() => {
    latestRef.current = fn
  }, [fn])

  const debounced = useMemo(() => {
    const call = (...args: Parameters<T>) => {
      const invoke = () => latestRef.current(...args)
      if (opts?.scheduler) opts.scheduler(invoke)
      else invoke()
    }
    const d = _.debounce(call, wait, opts)
    return d
    // recreate only when timing/behavior options change
  }, [wait, opts])

  useEffect(() => () => debounced.cancel(), [debounced])

  return debounced as _.DebouncedFunc<T>
}
