import { useEffect } from 'react'

/** Prefetches images on mount so they are decoded and cached by the time they are rendered. */
const usePrefetchImages = (srcs: string[]) => {
  useEffect(() => {
    srcs.forEach(src => {
      const img = new Image()
      img.src = src
      img.decode()
    })
    // Prefetch only on mount since srcs are static and a new array reference is created each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export default usePrefetchImages
