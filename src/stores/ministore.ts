import Emitter from 'emitter20'
import { useEffect, useRef, useState } from 'react'
import { act } from 'react-dom/test-utils'
import cancellable, { CancellablePromise } from '../util/cancellable'

export interface Ministore<T> {
  /* Get the full state of the store. */
  getState: () => T
  /** Subscribes to changes. Returns an unsubscribe function. */
  subscribe: (f: (state: T) => void) => () => void
  /** Subscribes to one update. Returns an unsubscribe function. */
  once: (predicate?: (state: T) => boolean) => CancellablePromise<T>
  /** Subscribes to changes to a slice of the state. */
  subscribeSelector: <S>(selector: (state: T) => S, f: (slice: S) => void, equals?: (a: S, b: S) => boolean) => void
  /** Updates the state. If the state is an object, accepts a partial update. Accepts an updater function that passes the old state. */
  update: (updatesOrUpdater: Partial<T> | ((oldState: T) => Partial<T>)) => void
  /** A hook that invokes a callback with side effects when the state changes. */
  useEffect: (f: (state: T) => void) => void
  /** A hook that subscribes to a slice of the state. */
  useSelector: <U>(selector: (state: T) => U) => U
  /** A hook that subscribes to the entire state. */
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
  const useChangeEffect = (cb: (state: T) => void) => useEffect(() => subscribe(cb), [cb])

  function useSelector<U>(selector: (state: T) => U): U
  function useSelector(): T
  /** A hook that subscribes to a slice of the state. If no selector is given, subscribes to the whole state. */
  function useSelector<U>(selector?: (state: T) => U): T | U {
    const [localState, setLocalState] = useState(selector ? selector(state) : state)
    const unmounted = useRef(false)

    useEffect(() => () => {
      unmounted.current = true
    })

    useEffect(
      () =>
        subscribe((stateNew: T) => {
          if (unmounted.current) return
          setLocalState(selector ? selector(stateNew) : stateNew)
        }),
      [selector],
    )

    return localState
  }

  /**
   * Subscribe directly to the state.
   *
   * @returns Unsubscribe function.
   */
  const subscribe = (f: (state: T) => void): (() => void) => {
    // We need to wrap the callback in act when the tests are running.
    // Do this here rather than in every test.
    // TODO: Move this to a stubbing function.
    const onChange =
      process.env.NODE_ENV === 'test'
        ? async (state: T) => {
            await act(() => Promise.resolve(f(state)))
          }
        : f
    emitter.on('change', onChange)
    return () => emitter.off('change', onChange)
  }

  /** Subscribe to a slice of the state. */
  const subscribeSelector = <S>(
    selector: (state: T) => S,
    f: (slice: S) => void,
    equals: (a: S, b: S) => boolean = (a, b) => a === b,
  ) => {
    let value = selector(state)
    subscribe((stateNew: T) => {
      const valueOld = value
      value = selector(state)
      if (!equals(value, valueOld)) {
        f(value)
      }
    })
  }

  /**
   * Subscribes to a single update. Optionally takes a predicate that can be used to wait until a specific condition is met before resolving.
   *
   * @returns Unsubscribe function.
   */
  const once = (predicate: (state: T) => boolean = () => true): CancellablePromise<T> => {
    let onChange: any

    /** Unsubscribes from the emitter. */
    const unsubscribe = () => emitter.off('change', onChange)

    const promise = new Promise<T>(resolve => {
      /** We need to wrap the callback in act when the tests are running.
       * Do this here rather than in every test. */
      // TODO: Move this to a stubbing function.
      onChange = (stateNew: T) => {
        if (!predicate(stateNew)) return
        const done =
          process.env.NODE_ENV === 'test'
            ? async (state: T) => {
                await act(() => Promise.resolve(resolve(state)))
              }
            : resolve

        unsubscribe()
        done(stateNew)
      }
      emitter.on('change', onChange)
    })

    return cancellable<T>(promise, unsubscribe)
  }

  return {
    getState: () => state,
    once,
    subscribe,
    subscribeSelector,
    update,
    useEffect: useChangeEffect,
    useSelector,
    useState: useSelector as () => T,
  }
}

export default ministore
