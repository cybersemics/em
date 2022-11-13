import Emitter from 'emitter20'
import { useEffect, useRef, useState } from 'react'

/** Creates a mini store that tracks state and can update consumers. */
const ministore = <T = any>(initialState: T) => {
  let state: T = initialState
  const emitter = new Emitter()

  /** Updates one or more values in state. */
  const update = (updatesOrUpdater: Partial<T> | ((state: T) => Partial<T>)) => {
    const updates = typeof updatesOrUpdater === 'function' ? updatesOrUpdater(state) : updatesOrUpdater

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

  /** A hook that invokes a callback when the state changes. */
  const useChangeEffect = (cb: (state: T) => void) => {
    useEffect(() => {
      emitter.on('change', cb)
      return () => {
        emitter.off('change', cb)
      }
    }, [])
  }

  /** A hook that subscribes to a slice of the state. If no selector is given, subscribes to the whole state. */
  const useSelector = <U>(selector?: (state: T) => U) => {
    const [localState, setLocalState] = useState(selector ? selector(state) : state)
    const unmounted = useRef(false)

    useEffect(() => {
      /** Updates local state on store state change. */
      const onChange = (stateNew: T) => {
        if (!unmounted.current) {
          setLocalState(selector ? selector(state) : state)
        }
      }
      emitter.on('change', onChange)
      return () => {
        emitter.off('change', onChange)
        unmounted.current = true
      }
    }, [])

    return localState
  }

  /** Subscribe directly to the state. */
  const subscribe = (f: (state: T) => void) => {
    emitter.on('change', f)
    return () => emitter.off('change', f)
  }

  return {
    getState: () => state,
    update,
    subscribe,
    useEffect: useChangeEffect,
    useSelector,
    /** A hook that subscribes to the entire state. */
    useState: useSelector as () => T,
  }
}

export default ministore
