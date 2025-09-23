import { useEffect, useRef } from 'react'

/** Retains & returns the previous value passed in each time the hook is invoked. */
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

export default usePrevious
