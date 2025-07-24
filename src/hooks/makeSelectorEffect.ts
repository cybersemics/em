import { useLayoutEffect, useRef } from 'react'
import Store from '../@types/Store'

/**
 * Creates a useLayoutEffect hook that invokes a callback when a slice of a given store's state changes. Unlike useSelector, this hook does NOT trigger re-renders - it calls the effect directly when the selected state changes. This is useful for DOM calculations that need to be performed after a state change but should not cause component re-renders.
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
 * const select = useCallback(state => state.someValue, [])
 * const effect = useCallback(newValue => {
 * // This runs without causing a re-render
 * updateDOM(newValue)
 * }, [])
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

    useLayoutEffect(
      () =>
        // Returns unsubscribe which is called on unmount.
        store.subscribe(() => {
          const current = select(store.getState())

          // Only run effect if value has changed according to equality function
          if (equalityFn ? !equalityFn(current, prev.current) : current !== prev.current) {
            // Call effect directly without setState to avoid re-renders
            // Use requestAnimationFrame to ensure DOM updates are complete
            requestAnimationFrame(() => effect(current))
          }
          prev.current = current
        }),
      [effect, equalityFn, select],
    ) // These functions should be memoized to prevent unnecessary re-subscriptions
  }
}

export default makeSelectorEffect
