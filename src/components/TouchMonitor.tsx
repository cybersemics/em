import lifecycle from 'page-lifecycle'
import { FC, PropsWithChildren, useEffect } from 'react'
import touchStore from '../stores/touchStore'

/** Turns off touching when app becomes hidden. */
const onStateChange = ({ newState }: { oldState: string; newState: string }) => {
  if (newState === 'hidden') {
    touchStore.update({ touching: false })
  }
}

/** A higher-order component that monitors whether the user is touching the screen or not. */
const TouchMonitor: FC<PropsWithChildren> = ({ children }) => {
  // turn off touching when app becomes hidden
  useEffect(() => {
    lifecycle.addEventListener('statechange', onStateChange)
    return () => lifecycle.addEventListener('statechange', onStateChange)
  })

  return (
    <div
      onTouchMove={() => {
        touchStore.update({ touching: true })
      }}
      onTouchEnd={() => {
        touchStore.update({ touching: false })
      }}
    >
      {children}
    </div>
  )
}

export default TouchMonitor
