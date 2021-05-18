import { useEffect, useRef } from 'react'

type HandleChangeFunction = () => void

/** Handles visual viewport resize change. */
const useViewportChange = (handleChange: HandleChangeFunction) => {

  const prevHandleChange = useRef<HandleChangeFunction | null>(null)

  useEffect(() => {
    window.visualViewport.addEventListener('resize', handleChange)

    // if handler changes then remove the previous event listener.
    if (prevHandleChange.current) window.visualViewport.removeEventListener('resize', handleChange)
    prevHandleChange.current = handleChange

    return () => {
      window.visualViewport.removeEventListener('resize', handleChange)
    }
  }, [handleChange])
}

export default useViewportChange
