import { useCallback, useEffect, useRef } from 'react'

/**
 * Keeps a callback function fresh between renders, preventing stale values.
 * Returns a stable function that always calls the latest version of callback.
 *
 * @param callback - Function that needs fresh values
 * @param dependencies - Values that should trigger callback updates
 */
const useFreshCallback = <T extends (...args: any[]) => any>(callback: T, dependencies: React.DependencyList): T => {
  // Store the latest callback in a ref
  const callbackRef = useRef(callback)

  // Update our ref whenever dependencies or callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback, ...dependencies])

  // Return a stable function that always uses the fresh callback
  return useCallback(
    ((...args: any[]) => {
      return callbackRef.current(...args)
    }) as T,
    [],
  )
}

export default useFreshCallback
