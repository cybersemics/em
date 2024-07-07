import { useEffect, useSyncExternalStore } from 'react'
import makeSelectorEffect from '../hooks/makeSelectorEffect'
import ministore from './ministore'

/** Enhances a ministore with React hooks. */
const reactMinistore = <T>(initialState: T) => {
  const store = ministore(initialState)

  /** A hook that invokes a callback when the state changes. */
  const useChangeEffect = (cb: (state: T) => void) => useEffect(() => store.subscribe(cb), [cb])

  function useSelector<U>(selector: (state: T) => U): U
  function useSelector(): T
  /** A hook that subscribes to a slice of the state. If no selector is given, subscribes to the whole state. */
  function useSelector<U>(selector?: (state: T) => U): T | U {
    const value = useSyncExternalStore(store.subscribe, () =>
      selector ? selector(store.getState()) : store.getState(),
    )

    return value
  }

  return {
    ...store,
    useEffect: useChangeEffect,
    useSelector,
    useSelectorEffect: makeSelectorEffect(store),
    useState: useSelector as () => T,
  }
}

export default reactMinistore
