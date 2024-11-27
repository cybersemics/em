import { useEffect, useState } from 'react'

/** Retains & returns the previous value passed in each time the hook is invoked. */
function usePrevious<T>(value: T): T | undefined {
  const [current, setCurrent] = useState(value)
  const [previous, setPrevious] = useState(value)

  useEffect(() => {
    if (current !== value) {
      setPrevious(current)
      setCurrent(value)
    }
  }, [current, value])

  return previous
}

export default usePrevious
