import { useEffect, useRef } from 'react'
import Store from '../@types/Store'

/** Creates a useEffect hook that invokes a callback when a slice of a given store's state changes. Unlike useSelector, triggers the callback without re-rendering the component. Useful when a DOM calculation needs to be performed after a state change, but does not always require a re-render. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeSelectorEffect = <U extends Store<any>>(store: U) => {
  type S = U extends Store<infer V> ? V : never

  return <T>(effect: (slice: T) => void, select: (state: S) => T, equalityFn?: (a: T, b: T) => boolean) => {
    const prev = useRef<T>(select(store.getState()))
    useEffect(
      () =>
        // Returns unsubscribe which is called on unmount.
        store.subscribe(() => {
          const current = select(store.getState())
          if (equalityFn ? !equalityFn(current, prev.current) : current !== prev.current) {
            effect(current)
          }
          prev.current = current
        }),
      [effect, equalityFn, select],
    )
  }
}

export default makeSelectorEffect
