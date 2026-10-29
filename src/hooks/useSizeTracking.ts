import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Index from '../@types/IndexType'
import ThoughtId from '../@types/ThoughtId'

/** Returns a copy of the record without the given key, or the same record if the key is absent, so that removing an untracked key does not trigger a re-render. */
const omitKey = <T>(record: Index<T>, key: string): Index<T> => {
  if (!(key in record)) return record
  const recordNew = { ...record }
  delete recordNew[key]
  return recordNew
}

/** Dynamically update and remove heights and widths for different keys. */
const useSizeTracking = () => {
  // Track dynamic thought heights from inner refs via VirtualThought. These are used to set the absolute y position which enables animation between any two states. isVisible is used to crop hidden thoughts.
  const [heights, setHeights] = useState<Index<{ height: number; isVisible: boolean; cliff: number }>>({})
  // Track thought widths separately from heights. Only table col1 widths are read, to size the column.
  // A width outlives its height: removeSize drops the height when VirtualThought unmounts, including when list virtualization unmounts a thought that is still in the tree, while removeWidth drops the width only when the thought leaves the tree. Otherwise col1 would narrow whenever its widest thought is virtualized, which moves that thought back above the virtualization cutoff, and it would flicker indefinitely.
  const [widths, setWidths] = useState<Index<number>>({})
  const unmounted = useRef(false)

  const removeSize = useCallback((key: string) => {
    if (unmounted.current) return
    setHeights(heightsOld => omitKey(heightsOld, key))
  }, [])

  const removeWidth = useCallback((key: string) => {
    if (unmounted.current) return
    setWidths(widthsOld => omitKey(widthsOld, key))
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
        setHeights(heightsOld =>
          height === heightsOld[key]?.height && isVisible === heightsOld[key]?.isVisible
            ? heightsOld
            : {
                ...heightsOld,
                [key]: {
                  height,
                  cliff,
                  isVisible,
                },
              },
        )
        setWidths(widthsOld =>
          !width ? omitKey(widthsOld, key) : width === widthsOld[key] ? widthsOld : { ...widthsOld, [key]: width },
        )
      } else {
        removeSize(key)
      }
    },
    [removeSize],
  )

  useEffect(() => {
    return () => {
      unmounted.current = true
    }
  }, [])

  return useMemo(
    () => ({
      heights,
      widths,
      setSize,
      removeWidth,
    }),
    [heights, widths, setSize, removeWidth],
  )
}

export default useSizeTracking
