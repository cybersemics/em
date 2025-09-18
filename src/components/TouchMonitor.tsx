import lifecycle from 'page-lifecycle'
import { FC, PropsWithChildren, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Settings } from '../constants'
import globals from '../globals'
import getUserSetting from '../selectors/getUserSetting'
import isInGestureZone from '../util/isInGestureZone'

/** Turns off touching when app becomes hidden. */
const onStateChange = ({ newState }: { oldState: string; newState: string }) => {
  if (newState === 'hidden') {
    globals.touchState.moving = false
    globals.touchState.canLongPress = true
  }
}

/** A higher-order component that monitors whether the user is touching the screen or not. */
const TouchMonitor: FC<PropsWithChildren> = ({ children }) => {
  const leftHanded = useSelector(getUserSetting(Settings.leftHanded))

  // turn off touching when app becomes hidden
  useEffect(() => {
    lifecycle.addEventListener('statechange', onStateChange)
    return () => lifecycle.addEventListener('statechange', onStateChange)
  })

  return (
    <div
      onTouchStartCapture={({ nativeEvent: { touches } }) => {
        globals.touchState.canLongPress = isInGestureZone(touches[0].pageX, touches[0].pageY, leftHanded)
      }}
      onTouchMove={() => {
        globals.touchState.moving = true
      }}
      onTouchEnd={() => {
        globals.touchState.moving = false
      }}
    >
      {children}
    </div>
  )
}

export default TouchMonitor
