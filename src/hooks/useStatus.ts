import { useEffect, useState } from 'react'
import WebsocketStatus from '../@types/WebsocketStatus'

/** A hook that subscribes to the permissions WebsocketProvider's connection status. Uses the permissions instead of thoughtspace provider since the thoughtspace provider is only connected if the thoughtspace is shared with more than one device. */
export const useStatus = () => {
  const [state] = useState<WebsocketStatus>('disconnected' /* websocket.status */)

  // const updateState = useCallback(({ status }: { status: WebsocketStatus }) => setState(status), [])

  useEffect(() => {
    // websocket.on('status', updateState)
    return () => {
      // websocket.off('status', updateState)
    }
  })

  return state
}

export default useStatus
