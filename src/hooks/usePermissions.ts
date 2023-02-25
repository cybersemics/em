import { useCallback, useEffect, useState } from 'react'
import { shallowEqual } from 'react-redux'
import * as Y from 'yjs'
import Index from '../@types/IndexType'
import Share from '../@types/Share'
import { permissionsClientDoc } from '../data-providers/yjs'

// Infer the generic type of a specific YEvent such as YMapEvent or YArrayEvent
// This is needed because YEvent is not generic.
type ExtractYEvent<T> = T extends Y.YMapEvent<infer U> | Y.YArrayEvent<infer U> ? U : never

const yPermissionsMap = permissionsClientDoc.getMap<Share>()

/** Subscribes to a yjs shared type, e.g. Y.Map. Performs shallow comparison between new and old state and only updates if shallow value has changed. */
const useSharedType = <T>(yobj: Y.AbstractType<T>): Index<ExtractYEvent<T>> => {
  const [state, setState] = useState<Index<ExtractYEvent<T>>>(yobj.toJSON())

  const updateState = useCallback(async e => {
    const stateNew: Index<ExtractYEvent<T>> = yobj.toJSON()
    setState((stateOld: any) => (!shallowEqual(stateNew, stateOld) ? stateNew : stateOld))
  }, [])

  useEffect(() => {
    yobj.observe(updateState)
    return () => {
      yobj.unobserve(updateState)
    }
  })

  return state
}

/** A hook that subscribes to yPermissions. */
const usePermissions = (): Index<Share> => useSharedType(yPermissionsMap)

export default usePermissions
