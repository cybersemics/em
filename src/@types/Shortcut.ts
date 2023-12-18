import React from 'react'
import { GestureResponderEvent } from 'react-native'
import Dispatch from './Dispatch'
import GesturePath from './GesturePath'
import Icon from './Icon'
import Key from './Key'
import ShortcutId from './ShortcutId'
import ShortcutType from './ShortcutType'
import State from './State'

interface Shortcut {
  /** Allow the shortcut to be executed when a modal is open. */
  allowExecuteFromModal?: boolean

  // a function that returns true if the shortcut can be executed with the current state
  canExecute?: (getState: () => State) => boolean

  // an ad hoc property to track conflicting shortcuts
  // this should not be in the main Shortcut type
  conflicts?: string[]

  // a description of what the shortcut does that is shown in the Help modal
  description?: string | ((getState: () => State) => string)

  // a description of what the shortcut does whnn it is in an inverse state
  descriptionInverse?: string | ((getState: () => State) => string)

  // a function that returns an error message if the shortcut should indicate an error
  error?: (getState: () => State) => string | null

  // executes the shortcut
  exec: (
    dispatch: Dispatch,
    getState: () => State,
    e: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent,
    { type }: { type: ShortcutType },
  ) => void

  // a MultiGesture sequence to activate the shortcut on touch screens
  gesture?: GesturePath | GesturePath[]

  // hide the shortcut CommandPalette
  hideFromCommandPalette?: boolean

  // hide the shortcut from the Help modal
  hideFromInstructions?: boolean

  // a readable, internal unique id
  id: ShortcutId

  // a function that returns true if the shortcut should be highlighted in the Toolbar
  isActive?: (getState: () => State) => boolean

  // when true, a small open dropdown indicator will be rendered beneath the icon
  isDropdownOpen?: (getState: () => State) => boolean

  // a keyboard sequence to activate the shortcut
  keyboard?: Key | string

  // short label
  label: string

  // For toggling shortcuts, a short label that indicates the inverse action from the current state (e.g. "Add to Favorites" and "Remove from Favorites")
  labelInverse?: string

  // specify backup gesture or keyboard that is shown in the Toolbar overlay
  overlay?: {
    gesture?: GesturePath
    keyboard?: Key | string
  }

  // an icon that represents the shortcut in the Toolbar
  svg?: (icon: Icon) => React.ReactNode
}

export default Shortcut
