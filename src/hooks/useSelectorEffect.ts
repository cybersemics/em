import { useEffect, useRef } from 'react'
import State from '../@types/State'
import store from '../stores/app'

/** Invokes a callback when a slice of the state changes without re-rendering the component. Useful when a DOM calculation needs to be performed after a state change, but does not always require a re-render. */
const useSelectorEffect = <T>(
  select: (state: State) => T,
  callback: () => void,
  equalityFn?: (a: T, b: T) => boolean,
) => {
  const prev = useRef<T>(select(store.getState()))
  useEffect(
    () =>
      // Returns unsubscribe which is called on unmount.
      store.subscribe(() => {
        const current = select(store.getState())
        if (equalityFn ? !equalityFn(current, prev.current) : current !== prev.current) {
          // Wait till the next tick, otherwise the callback will be called before components are re-rendered.
          setTimeout(callback)
        }
        prev.current = current
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
}

export default useSelectorEffect
