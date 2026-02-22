import lifecycle from 'page-lifecycle'
import { FC, PropsWithChildren, useEffect } from 'react'
import globals from '../globals'

/** Turns off touching when app becomes hidden. */
const onStateChange = ({ newState }: { oldState: string; newState: string }) => {
  if (newState === 'hidden') {
    globals.touching = false
  }
}

/** A higher-order component that monitors whether the user is touching the screen or not. */
const TouchMonitor: FC<PropsWithChildren> = ({ children }) => {
  // turn off touching when app becomes hidden
  useEffect(() => {
    lifecycle.addEventListener('statechange', onStateChange)
    return () => lifecycle.removeEventListener('statechange', onStateChange)
  }, [])

  return (
    <div
      onTouchMove={() => {
        globals.touching = true
      }}
      onTouchEnd={() => {
        globals.touching = false
      }}
    >
      {children}
    </div>
  )
}

export default TouchMonitor
