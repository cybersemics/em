import Emitter from 'emitter20'
import { useEffect, useRef, useState } from 'react'
import { act } from 'react-dom/test-utils'

export interface Ministore<T> {
  // get the full state of the store
  getState: () => T
  // subscribe to changes
  subscribe: (f: (state: T) => void) => void
  // Updates the state. If the state is an object, accepts a partial update. Accepts an updater function that passes the old state.
  update: (updatesOrUpdater: Partial<T> | ((oldState: T) => Partial<T>)) => void
  // a hook that invokes a callback with side effects when the state changes
  useEffect: (f: (state: T) => void) => void
  // a hook that subscribes to a slice of the state
  useSelector: <U>(selector: (state: T) => U) => U
  // a hook that subscribes to the entire state
  useState: () => T
}

/** Creates a mini store that tracks state and can update consumers. */
const ministore = <T>(initialState: T): Ministore<T> => {
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

  function useSelector<U>(selector: (state: T) => U): U
  function useSelector(): T
  /** A hook that subscribes to a slice of the state. If no selector is given, subscribes to the whole state. */
  function useSelector<U>(selector?: (state: T) => U): T | U {
    const [localState, setLocalState] = useState(selector ? selector(state) : state)
    const unmounted = useRef(false)

    useEffect(() => {
      /** Updates local state on store state change. */
      const onChange = (stateNew: T) => {
        if (!unmounted.current) {
          setLocalState(selector ? selector(state) : state)
        }
      }
      const unsubscribe = subscribe(onChange)
      return () => {
        unsubscribe()
        unmounted.current = true
      }
    }, [])

    return localState
  }

  /** Subscribe directly to the state. */
  const subscribe = (f: (state: T) => void) => {
    // We need to wrap the callback in act when the tests are running.
    // Do this once here rather than in every test.
    // TODO: Move this to a stubbing function.
    if (process.env.NODE_ENV === 'test') {
      emitter.on('change', (state: T) => {
        act(() => f(state))
      })
    } else {
      emitter.on('change', f)
    }
    return () => emitter.off('change', f)
  }

  return {
    getState: () => state,
    subscribe,
    update,
    useEffect: useChangeEffect,
    useSelector,
    useState: useSelector as () => T,
  }
}

export default ministore
