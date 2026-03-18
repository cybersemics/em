import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import Index from '../@types/IndexType'
import ThoughtId from '../@types/ThoughtId'

/** Dynamically update and remove sizes for different keys. */
const useSizeTracking = () => {
  // Track dynamic thought sizes from inner refs via VirtualThought. These are used to set the absolute y position which enables animation between any two states. isVisible is used to crop hidden thoughts.
  const [sizes, setSizes] = useState<Index<{ height: number; width?: number; isVisible: boolean }>>({})
  const fontSize = useSelector(state => state.fontSize)
  const unmounted = useRef(false)

  const removeSize = useCallback((key: string) => {
    if (unmounted.current) return
    setSizes(sizesOld => {
      delete sizesOld[key]
      return sizesOld
    })
  }, [])

  /** Update the size record of a single thought. Make sure to use a key that is unique across thoughts and context views. This should be called whenever the size of a thought changes to ensure that y positions are updated accordingly and thoughts are animated into place. Otherwise, y positions will be out of sync and thoughts will start to overlap. */
  const setSize = useCallback(
    ({
      cliff,
      height,
      width,
      isVisible,
      key,
    }: {
      cliff: number
      height: number | null
      width?: number | null
      id: ThoughtId
      isVisible: boolean
      key: string
    }) => {
      if (height !== null) {
        // To create the correct selection behavior, thoughts must be clipped on the top and bottom. Otherwise the top and bottom 1px cause the caret to move to the beginning or end of the editable. But clipPath creates a gap between thoughts. To eliminate this gap, thoughts are rendered with a slight overlap by subtracting a small amount from each thought's measured height, thus affecting their y positions as they are rendered.
        // See: clipPath in recipes/editable.ts
        const lineHeightOverlap = fontSize / 8
        const heightClipped = height - lineHeightOverlap

        setSizes(sizesOld =>
          heightClipped === sizesOld[key]?.height &&
          width === sizesOld[key]?.width &&
          isVisible === sizesOld[key]?.isVisible
            ? sizesOld
            : {
                ...sizesOld,
                [key]: {
                  height: heightClipped,
                  width: width || undefined,
                  cliff,
                  isVisible,
                },
              },
        )
      } else {
        removeSize(key)
      }
    },
    [fontSize, removeSize],
  )

  useEffect(() => {
    return () => {
      unmounted.current = true
    }
  }, [])

  return useMemo(
    () => ({
      sizes,
      setSize,
    }),
    [sizes, setSize],
  )
}

export default useSizeTracking
