import { useCallback, useEffect, useState } from 'react'
import { shallowEqual } from 'react-redux'
import * as Y from 'yjs'
import Index from '../@types/IndexType'

// Infer the generic type of a specific YEvent such as YMapEvent or YArrayEvent
// This is needed because YEvent is not generic.
type ExtractYEvent<T> = T extends Y.YMapEvent<infer U> | Y.YArrayEvent<infer U> ? U : never

/** Subscribes to a yjs shared type, e.g. Y.Map. Performs shallow comparison between new and old state and only updates if shallow value has changed. */
const useSharedType = <T>(yobj: Y.AbstractType<T>): Index<ExtractYEvent<T>> => {
  const [state, setState] = useState<Index<ExtractYEvent<T>>>(yobj.toJSON())

  const updateState = useCallback(
    async e => {
      const stateNew: Index<ExtractYEvent<T>> = yobj.toJSON()
      setState((stateOld: Index<ExtractYEvent<T>>) => (!shallowEqual(stateNew, stateOld) ? stateNew : stateOld))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(
    () => {
      yobj.observe(updateState)
      return () => {
        yobj.unobserve(updateState)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return state
}

export default useSharedType
