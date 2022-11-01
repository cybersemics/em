import Emitter from 'emitter20'
import { useEffect, useRef, useState } from 'react'

/** Creates a mini store that tracks state and can update consumers. */
const ministore = <T = any>(initialState: T) => {
  let state: T = initialState
  const emitter = new Emitter()

  /** Updates state. Only overwrites the given keys and preserves the rest. */
  const update = (updates: Partial<T>) => {
    // short circuit if value(s) are unchanged
    if (
      updates && typeof updates === 'object'
        ? Object.entries(updates).every(([key, value]) => value === (state as any)[key])
        : updates === state
    )
      return

    state = updates && typeof updates === 'object' ? { ...state, ...updates } : updates

    // Since store updates can trigger re-renders through hooks, wait till the next tick to ensure that reducers have finished.
    // Otherwise it causes a React error due to calling store.getState() while the reducer is executing.
    setTimeout(() => {
      emitter.trigger('change', updates)
    })
  }

  /** A hook that subscribes to a slice of the state. If no selector is given, subscribes to the whole state. */
  const useSelector = <U>(selector?: (state: T) => U) => {
    const [localState, setLocalState] = useState(state)
    const unmounted = useRef(false)

    useEffect(() => {
      emitter.on('change', value => {
        if (!unmounted.current) {
          setLocalState(value)
        }
      })
      return () => {
        emitter.clear('change')
        unmounted.current = true
      }
    }, [])

    return selector ? selector(localState) : localState
  }

  return {
    /** Gets the state. */
    getState: () => state,

    /** Updates one or more values in state and trigger a change. */
    update,

    /** A hook that subscribes to the entire state. */
    useState: useSelector as () => T,

    /** A hook that subscribes to a slice of the state. */
    useSelector,
  }
}

export default ministore
