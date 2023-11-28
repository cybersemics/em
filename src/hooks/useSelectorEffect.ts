import { useEffect, useRef } from 'react'
import State from '../@types/State'
import store from '../stores/app'

/** Invokes a callback when a slice of the state changes without re-rendering the component. Useful when a DOM calculation needs to be performed after a state change, but does not always require a re-render. */
const useSelectorEffect = <T>(
  effect: () => void,
  select: (state: State) => T,
  equalityFn?: (a: T, b: T) => boolean,
) => {
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

export default useSelectorEffect
