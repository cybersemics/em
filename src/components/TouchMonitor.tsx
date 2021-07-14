import lifecycle from 'page-lifecycle'
import React, { FC, useEffect } from 'react'
import globals from '../globals'

/** Turns off touching when app becomes hidden. */
const onStateChange = ({ oldState, newState }: { oldState: string; newState: string }) => {
  if (newState === 'hidden') {
    globals.touching = false
  }
}

/** A higher-order component that monitors whether the user is touching the screen or not. */
const TouchMonitor: FC = ({ children }) => {
  // turn off touching when app becomes hidden
  useEffect(() => {
    lifecycle.addEventListener('statechange', onStateChange)
    return () => lifecycle.addEventListener('statechange', onStateChange)
  })

  return (
    <div
      onTouchMove={() => {
        globals.touching = true
      }}
      onTouchEnd={() => {
        globals.touching = false
        globals.touched = true
      }}
    >
      {children}
    </div>
  )
}

export default TouchMonitor
