import { useCallback, useEffect, useRef, useState } from 'react'
import once from '../util/once'

/** A hook that safely subscribes to the result of a promise. Avoids calling setState after unmount. */
const usePromise = <T>(promise: Promise<T>, defaultValue?: T) => {
  const [state, setState] = useState<T | undefined>(defaultValue)
  const unmounted = useRef(false)

  // subscribe to the promise only once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subscribe = useCallback(
    once(() => {
      promise.then(value => {
        // prevent setState being called after unmount
        if (unmounted.current) return
        setState(value)
      })
    }),
    [],
  )

  // Subscribe immediately in case the promise is already resolved.
  // The next tick will be faster than useEffect if the promise is already resolved.
  subscribe()

  // prevent setState being called after unmount
  useEffect(
    () => () => {
      unmounted.current = true
    },
    [],
  )

  return state
}

export default usePromise
