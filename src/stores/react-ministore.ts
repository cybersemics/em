import { useEffect, useRef, useState } from 'react'
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
    const state = store.getState()
    const [localState, setLocalState] = useState(selector ? selector(state) : state)
    const unmounted = useRef(false)

    useEffect(
      () =>
        store.subscribe((stateNew: T) => {
          Promise.resolve().then(() => {
            if (unmounted.current) return
            const state = store.getState()
            setLocalState(selector ? selector(state) : state)
          })
        }),
      [selector],
    )

    useEffect(
      () => () => {
        unmounted.current = true
      },
      [],
    )

    return localState
  }

  return {
    ...store,
    useEffect: useChangeEffect,
    useSelector,
    useState: useSelector as () => T,
  }
}

export default reactMinistore
