import { useCallback, useEffect, useState } from 'react'
import WebsocketStatus from '../@types/WebsocketStatus'
import { websocketProviderPermissions } from '../data-providers/yjs'

/** A hook that subscribes to the permissions WebsocketProvider's connection status. Uses the permissions instead of thoughtspace provider since the thoughtspace provider is only connected if the thoughtspace is shared with more than one device. */
export const useStatus = () => {
  const [state, setState] = useState<WebsocketStatus>(
    websocketProviderPermissions.wsconnected ? 'connected' : 'disconnected',
  )

  const updateState = useCallback((e: { status: WebsocketStatus }) => setState(e.status), [])

  useEffect(() => {
    websocketProviderPermissions.on('status', updateState)
    return () => {
      websocketProviderPermissions.off('status', updateState)
    }
  })

  return state
}

export default useStatus
