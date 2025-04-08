import { useCallback, useEffect, useRef } from 'react'

/**
 * Custom hook that returns a memoized callback that always has access to the latest
 * values of its dependencies, preventing stale closure issues.
 *
 * Similar to useCallback, but the returned function reference is stable across renders,
 * while the executed logic always uses the latest dependency values.
 *
 * @param callback - The function to memoize and keep fresh.
 * @param dependencies - Dependency array. The latest callback closing over these will be used.
 * @returns A stable memoized function reference that executes the latest callback logic.
 */
const useFreshCallback = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  dependencies: React.DependencyList,
): T => {
  const callbackRef = useRef<T>(callback)

  // Update the ref with the latest callback whenever the callback or dependencies change
  useEffect(() => {
    callbackRef.current = callback
    // eslint-disable-next-line react-hooks/exhaustive-deps -- The spread is intentional for this hook pattern
  }, [callback, ...dependencies])

  // Return a stable memoized function that always calls the latest callback via the ref
  return useCallback(
    ((...args: Parameters<T>): ReturnType<T> => {
      // Execute the function currently stored in the ref
      return callbackRef.current(...args)
    }) as T,
    [], // No dependencies needed for the outer useCallback, ensuring stable reference
  )
}

export default useFreshCallback
