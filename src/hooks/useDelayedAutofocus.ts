import { useEffect, useRef, useState } from 'react'
import Autofocus from '../@types/Autofocus'

/** Returns an autofocus delayed by a given amount. Useful for replacing thoughts with placeholders after they have faded out. Takes an optional selector of the delayed autofocus which minimizes re-renders. */
const useDelayedAutofocus = <T = string>(
  autofocus: Autofocus,
  { delay, selector }: { delay: number; selector: (autofocus: Autofocus) => T } = {
    delay: 750,
    selector: (autofocus: Autofocus) => autofocus as unknown as T,
  },
) => {
  // When a selector is provided, rather than store the delayed autofocus value itself, we store the result of calling the selector on the delayed autofocus value.
  // This ensures that the component is only re-rendered when the selector result changes, not every time the delayed autofocus value changes.
  const [autofocusDelayed, setAutofocusDelayed] = useState(selector(autofocus))
  const lastAutofocusRef = useRef(autofocus)
  const unmounted = useRef(false)
  const autofocusTimerRef = useRef<number>(0)
  useEffect(
    () => {
      clearTimeout(autofocusTimerRef.current)
      if (
        autofocus !== 'show' &&
        autofocus !== 'dim' &&
        (lastAutofocusRef.current === 'show' || lastAutofocusRef.current === 'dim')
      ) {
        autofocusTimerRef.current = setTimeout(() => {
          if (unmounted.current) return
          setAutofocusDelayed(selector(autofocus))
          lastAutofocusRef.current = autofocus
        }, delay) as unknown as number
      } else {
        setAutofocusDelayed(selector(autofocus))
        lastAutofocusRef.current = autofocus
      }

      return () => {
        unmounted.current = true
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [autofocus],
  )

  return autofocusDelayed
}

export default useDelayedAutofocus
