import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react'
import Store from '../@types/Store'
import makeSelectorEffect from '../hooks/makeSelectorEffect'
import useLayoutAnimationFrameEffect from '../hooks/useLayoutAnimationFrameEffect'
import ministore, { Ministore } from './ministore'

/** Enhances a generic store with React hooks. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeReactStore = <U extends Store<any>>(store: U) => {
  type T = U extends Store<infer V> ? V : never

  /** A hook that invokes a callback when the state changes. */
  const useChangeEffect = (cb: (state: T) => void) =>
    useEffect(
      () =>
        store.subscribe(() => {
          cb(store.getState())
        }),
      [cb],
    )

  /** UseLayoutEffect hook that invokes a callback with current state synchronously after DOM mutations. */
  const useChangeLayoutEffect = (cb: (state: T) => void) => {
    const value = useSyncExternalStore(store.subscribe, () => store.getState())
    useLayoutEffect(() => cb(value), [cb, value])
  }

  /** UseLayoutAnimationFrameEffect hook that invokes a callback with current state on next animation frame. */
  const useChangeLayoutAnimationFrameEffect = (cb: (state: T) => void) => {
    const value = useSyncExternalStore(store.subscribe, () => store.getState())
    useLayoutAnimationFrameEffect(() => cb(value), [cb, value])
  }

  function useSelector<U>(selector: (state: T) => U): U
  function useSelector(): T
  /** A hook that subscribes to a slice of the state. If no selector is given, subscribes to the whole state. */
  function useSelector<U>(selector?: (state: T) => U): T | U {
    const value = useSyncExternalStore(
      store.subscribe,
      selector ? () => selector(store.getState()) : () => store.getState(),
    )

    return value
  }

  return {
    ...store,
    useEffect: useChangeEffect,
    useLayoutEffect: useChangeLayoutEffect,
    useLayoutAnimationFrameEffect: useChangeLayoutAnimationFrameEffect,
    useSelector: useSelector as <U>(selector: (state: T) => U) => U,
    useSelectorEffect: makeSelectorEffect(store),
    useState: useSelector as () => T,
  }
}

/** Create a ministore that is enhanced with React hooks. */
const reactMinistore = <T>(initialState: T) => makeReactStore(ministore(initialState))

/** Create a read-only computed reactMinistore that derives its state from one or more ministores. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compose<T, S extends any[]>(compute: (...states: S) => T, stores: { [K in keyof S]: Ministore<S[K]> }) {
  const store = ministore.compose(compute, stores)
  return makeReactStore(store)
}

reactMinistore.compose = compose

export default reactMinistore
