import { useLayoutEffect, useRef, useState } from 'react'
import Store from '../@types/Store'
import useLayoutAnimationFrameEffect from './useLayoutAnimationFrameEffect'

/**
 * Creates a useEffect hook that invokes a callback when a slice of a given store's state changes.  Unlike useSelector, triggers the callback without re-rendering the component.  Useful when a DOM calculation needs to be performed after a state change, but does not always require a re-render.
 *
 * @template U - Store type with generic state.
 * @param store - The store instance to subscribe to.
 *
 * @returns A hook function that takes:
 * - effect: Callback to run when selected state changes. Should be memoized with useCallback to prevent recreation on each render.
 * - select: Selector function to pick state slice. Should be memoized or defined outside component to prevent recreation.
 * - equalityFn: Optional comparison function for state changes. Should be stable (e.g. lodash isEqual) or memoized.
 *
 * @example
 * // Create a selector effect for a specific store
 * const useSelectorEffect = makeSelectorEffect(myStore)
 *
 * // Use in component - memoize functions to prevent recreation
 * const select = useCallback(state => state.someValue, [necessary dependencies here])
 * const effect = useCallback(newValue => updateDOM(newValue), [necessary dependencies here])
 * useSelectorEffect(effect, select, isEqual)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeSelectorEffect = <U extends Store<any>>(store: U) => {
  // Extract the state type from the store generic
  type S = U extends Store<infer V> ? V : never

  return <T>(effect: (slice: T) => void, select: (state: S) => T, equalityFn?: (a: T, b: T) => boolean) => {
    // Keep track of previous selected value to compare changes
    // This ref persists between renders and is updated in the subscription
    const prev = useRef<T>(select(store.getState()))

    // State is used to trigger the layout effect when value changes
    // Unlike useSelector, this doesn't cause a re-render of the component
    const [state, setState] = useState<T>(select(store.getState()))

    useLayoutEffect(() => {
      // Returns unsubscribe which is called on unmount.
      store.subscribe(() => {
        const current = select(store.getState())

        // Only update state if value has changed according to equality function
        if (equalityFn ? !equalityFn(current, prev.current) : current !== prev.current) {
          setState(current)
        }
        prev.current = current
      })
    }, [equalityFn, select]) // These functions should be memoized to prevent unnecessary re-subscriptions

    useLayoutAnimationFrameEffect(() => {
      effect(state)
    }, [effect, state]) // effect should be memoized to prevent unnecessary effect runs
  }
}

export default makeSelectorEffect
