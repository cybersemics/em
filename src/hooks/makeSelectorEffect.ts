import { useEffect, useRef } from 'react'

interface Store<T> {
  getState: () => T
  subscribe: (cb: () => void) => any
}

/** Creates a useEffect hook that invokes a callback when a slice of a given store's state changes. Unlike useSelector, triggers the callback without re-rendering the component. Useful when a DOM calculation needs to be performed after a state change, but does not always require a re-render. */
const makeSelectorEffect =
  <S>(store: Store<S>) =>
  <T>(effect: () => void, select: (state: S) => T, equalityFn?: (a: T, b: T) => boolean) => {
    const prev = useRef<T>(select(store.getState()))
    useEffect(
      () =>
        // Returns unsubscribe which is called on unmount.
        store.subscribe(() => {
          const current = select(store.getState())
          if (equalityFn ? !equalityFn(current, prev.current) : current !== prev.current) {
            effect()
          }
          prev.current = current
        }),
      [effect, equalityFn, select],
    )
  }

export default makeSelectorEffect
