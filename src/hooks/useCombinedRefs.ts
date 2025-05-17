import React, { useCallback } from 'react'

/** Combines multiple refs into a single ref. */
const useCombinedRefs = <T>(refs: (React.Ref<T> | undefined | null)[]): React.Ref<T> => {
  return useCallback(
    (instance: T) => {
      refs.forEach(ref => {
        if (typeof ref === 'function') {
          ref(instance)
        } else if (ref) {
          const mutableRef = ref as React.MutableRefObject<T | null>
          mutableRef.current = instance
        }
      })
    },
    [refs],
  )
}

export default useCombinedRefs
