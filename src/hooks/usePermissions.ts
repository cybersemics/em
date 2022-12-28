import { useCallback, useEffect, useState } from 'react'
import { shallowEqual } from 'react-redux'
import * as Y from 'yjs'
import Index from '../@types/IndexType'
import Share from '../@types/Share'
import { ypermissionsDoc } from '../data-providers/yjs'

// Infer the generic type of a specific YEvent such as YMapEvent or YArrayEvent
// This is needed because YEvent is not generic.
type ExtractYEvent<T> = T extends Y.YMapEvent<infer U> | Y.YArrayEvent<infer U> ? U : never

const yPermissions = ypermissionsDoc.getMap<Index<Share>>('permissions')

/** Subscribes to a yjs shared type, e.g. Y.Map. Performs shallow comparison between new and old state and only updates if shallow value has changed. */
const useSharedType = <T>(yobj: Y.AbstractType<T>): ExtractYEvent<T> => {
  const [state, setState] = useState<ExtractYEvent<T>>(yobj.toJSON())

  const updateState = useCallback(async e => {
    const stateNew: Index<Share> = yobj.toJSON()
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
const usePermissions = () => useSharedType(yPermissions)

export default usePermissions
