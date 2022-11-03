import { useEffect, useRef, useState } from 'react'
import Autofocus from '../../@types/Autofocus'

/** Returns an autofocus delayed by a given amount. Useful for replacing thoughts with placeholders after they have faded out. */
const useDelayedAutofocus = (autofocus: Autofocus, delay = 750) => {
  const [autofocusDelayed, setAutofocusDelayed] = useState(autofocus)
  const lastAutofocusRef = useRef(autofocus)
  const autofocusTimerRef = useRef<number>(0)
  useEffect(() => {
    clearTimeout(autofocusTimerRef.current)
    if (
      autofocus !== 'show' &&
      autofocus !== 'dim' &&
      (lastAutofocusRef.current === 'show' || lastAutofocusRef.current === 'dim')
    ) {
      autofocusTimerRef.current = setTimeout(() => {
        setAutofocusDelayed(autofocus)
        lastAutofocusRef.current = autofocus
      }, 750) as unknown as number
    } else {
      setAutofocusDelayed(autofocus)
      lastAutofocusRef.current = autofocus
    }
  }, [autofocus])

  return autofocusDelayed
}

export default useDelayedAutofocus
