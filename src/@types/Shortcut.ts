import React from 'react'
import { Dispatch } from './Dispatch'
import { GesturePath } from './GesturePath'
import { GestureResponderEvent } from 'react-native'
import { Icon } from './Icon'
import { Key } from './Key'
import { State } from './State'

// how the shortcut was activated
export type ShortcutType = 'gesture' | 'keyboard' | 'toolbar'

export interface Shortcut {
  // a function that returns true if the shortcut can be executed with the current state
  canExecute?: (getState: () => State) => boolean

  // an ad hoc property to track conflicting shortcuts
  // this should not be in the main Shortcut type
  conflicts?: string[]

  // a description of what the shortcut does that is shown in the Help modal
  description?: string | ((getState: () => State) => string)

  // executes the shortcut
  exec: (
    dispatch: Dispatch,
    getState: () => State,
    e: Event | GestureResponderEvent | React.MouseEvent,
    { type }: { type: ShortcutType },
  ) => void

  // a MultiGesture sequence to activate the shortcut on touch screens
  gesture?: GesturePath | GesturePath[]

  // hide the shortcut from the Help modal
  hideFromInstructions?: boolean

  // a readable, internal unique id
  id: string

  // a function that returns true if the shortcut should be highlighted in the Toolbar
  isActive?: (getState: () => State) => boolean

  // a keyboard sequence to activate the shortcut
  keyboard?: Key | string

  // a short label that is shown in the gesture hint
  label: string

  // specify backup gesture or keyboard that is shown in the Toolbar overlay
  overlay?: {
    gesture?: GesturePath
    keyboard?: Key | string
  }

  // an icon that represents the shortcut in the Toolbar
  svg?: (icon: Icon) => React.ReactNode
}
