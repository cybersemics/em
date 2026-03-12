import { useEffect } from 'react'

/** Prefetches images on mount so they are decoded and cached by the time they are rendered. */
const usePrefetchImages = (srcs: string[]) => {
  useEffect(() => {
    srcs.forEach(src => {
      const img = new Image()
      img.src = src
      img.decode()
    })
  }, [])
}

export default usePrefetchImages
