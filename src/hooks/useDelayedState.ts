import { useCallback, useRef, useState } from 'react'

/** A hook that flips a boolean from false to true after the given amount of time. */
const useDelayedState = (
  /** Time in millisecons. */
  time: number,
) => {
  const [done, setDone] = useState(false)
  const timerRef = useRef(setTimeout(() => setDone(true), time))
  const cancel = useCallback(() => clearTimeout(timerRef.current), [])
  const flush = useCallback(() => {
    clearTimeout(timerRef.current)
    setDone(true)
  }, [setDone])
  return [done, flush, cancel] as const
}

export default useDelayedState
