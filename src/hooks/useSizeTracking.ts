import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import Index from '../@types/IndexType'
import ThoughtId from '../@types/ThoughtId'

// ms to debounce removal of size entries as VirtualThoughts are unmounted
const SIZE_REMOVAL_DEBOUNCE = 1000

/** Dynamically update and remove sizes for different keys. */
const useSizeTracking = () => {
  // Track dynamic thought sizes from inner refs via VirtualThought. These are used to set the absolute y position which enables animation between any two states. isVisible is used to crop hidden thoughts.
  const [sizes, setSizes] = useState<Index<{ height: number; width?: number; isVisible: boolean; mounted: boolean }>>(
    {},
  )
  const fontSize = useSelector(state => state.fontSize)
  const unmounted = useRef(false)

  // Track debounced height removals
  // See: removeSize
  const sizeRemovalTimeouts = useRef(new Map<string, number>())

  // Removing a size immediately on unmount can cause an infinite mount-unmount loop as the VirtualThought re-render triggers a new height calculation (iOS Safari only).
  // Debouncing size removal mitigates the issue.
  // Use throttleConcat to accumulate all keys to be removed during the interval.
  // TODO: Is a root cause of the mount-unmount loop.
  const removeSize = useCallback((key: string) => {
    setSizes(sizesOld => ({ ...sizesOld, [key]: { ...sizesOld[key], mounted: false } }))
    clearTimeout(sizeRemovalTimeouts.current.get(key))
    const timeout = setTimeout(() => {
      if (unmounted.current) return
      setSizes(sizesOld => {
        delete sizesOld[key]
        return sizesOld
      })
    }, SIZE_REMOVAL_DEBOUNCE) as unknown as number
    sizeRemovalTimeouts.current.set(key, timeout)
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

        // cancel thought removal timeout
        clearTimeout(sizeRemovalTimeouts.current.get(key))
        sizeRemovalTimeouts.current.delete(key)

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
                  mounted: true,
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
